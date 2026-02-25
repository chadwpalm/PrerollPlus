var express = require("express");
var router = express.Router();
var multer = require("multer");
var fs = require("fs");
var path = require("path");
var axios = require("axios").default;
const { getActivePort } = require("../backend/config");

// Global Variables

const LOG_TAG = "[WEBHOOK]";

var upload = multer({ dest: "/tmp/" });

const filePath = "/config/settings.js";

var settings;

const [hours, minutes] = (process.env.SCHEDULE_TIME?.split(":") || ["0", "0"]).map((part) => parseInt(part, 10) || 0);

// General Functions

async function isHolidayDay(
  country,
  holiday,
  states,
  type,
  source,
  apiKey,
  checkDate = null,
  pre = "0",
  post = "0",
  isCal = false,
) {
  const cacheDir = path.join("/", "config", "cache");
  const HolidayType = {
    1: "national",
    2: "local",
    3: "religious",
    4: "observance",
  };
  const typeName = HolidayType[parseInt(type, 10)];

  const today = checkDate
    ? new Date(Number(checkDate.split("-")[0]), Number(checkDate.split("-")[1]) - 1, Number(checkDate.split("-")[2]))
    : new Date();
  today.setHours(0, 0, 0, 0);

  const currentYear = today.getFullYear();

  let rawData, cacheFile;
  if (source === "2") {
    cacheFile = path.join(cacheDir, `${country}-calendarific-${typeName}-${currentYear}.json`);
  }
  if (source === "2" && fs.existsSync(cacheFile)) {
    if (!isCal) console.debug(`${LOG_TAG} [HOLIDAY] Cache hit for ${country}/${typeName}/${currentYear}`);
    rawData = fs.readFileSync(cacheFile, "utf-8");
  } else {
    if (!isCal) console.debug(`${LOG_TAG} [HOLIDAY] Fetching ${url.split("api_key=")[0]}...`);
    const url =
      source === "1"
        ? `https://date.nager.at/api/v3/publicholidays/${currentYear}/${country}`
        : `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=${country}&year=${currentYear}&type=${typeName}`;
    try {
      const response = await axios.get(url, { timeout: 2000 });
      rawData = JSON.stringify(response.data);
      if (source === "2") {
        fs.writeFileSync(cacheFile, rawData, "utf-8");
      }
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        let message = `Error while trying to connect to the ${typeName} Holiday API. `;
        if (source === "2") {
          switch (status) {
            case 401:
              message += "Unauthorized: Missing or incorrect API token.";
              break;
            case 422:
              if (data && data.meta && data.meta.error_code) {
                switch (data.meta.error_code) {
                  case 600:
                    message += "API is offline for maintenance.";
                    break;
                  case 601:
                    message += "Unauthorized: Missing or incorrect API token.";
                    break;
                  case 602:
                    message += "Invalid query parameters.";
                    break;
                  case 603:
                    message += "Subscription level required.";
                    break;
                  default:
                    message += `Unprocessable Entity: ${data.meta.error_detail || "Unknown error"}`;
                }
              } else {
                message += "Unprocessable Entity: Request was malformed.";
              }
              break;
            case 500:
              message += "Internal server error at Calendarific.";
              break;
            case 503:
              message += "Service unavailable (planned outage).";
              break;
            case 429:
              message += "Too many requests: API rate limit reached.";
              break;
            default:
              message += `Unexpected HTTP status: ${status}`;
          }
        } else if (source === "1") {
          switch (status) {
            case 400:
              message += "Bad request: invalid parameters.";
              break;
            case 401:
              message += "Unauthorized: Invalid API key or missing auth.";
              break;
            case 404:
              message += "Not found: Invalid endpoint or country code.";
              break;
            case 429:
              message += "Too many requests: API rate limit reached.";
              break;
            case 500:
              message += "Internal server error at Nager.Date.";
              break;
            default:
              message += `Unexpected HTTP status: ${status}`;
          }
        } else {
          message += "Unknown source specified.";
        }
        console.error(message);
      } else if (error.request) {
        console.error(`No response received from API (source=${source}).`);
      } else {
        console.error(`Error setting up request (source=${source}): ${error.message}`);
      }
      return false;
    }
  }

  let data;
  if (source === "2") {
    const parsed = JSON.parse(rawData);
    data = parsed.response.holidays.find((item) => item.name === holiday && item.locations === states);
  } else if (source === "1") {
    const parsed = JSON.parse(rawData);
    data = parsed.find((item) => {
      const stateString = item.counties === null ? "All" : item.counties.join(", ");
      return item.name === holiday && stateString === states;
    });
  }

  if (!data) {
    console.warn(`${LOG_TAG} [HOLIDAY] No match for "${holiday}" in ${country}/${typeName}`);
    return false;
  }

  const holidayDateStr = source === "2" ? data.date.iso : data.date;
  const [datePart] = holidayDateStr.split("T");
  const [year, month, day] = datePart.split("-").map(Number);

  const holidayDate = new Date(year, month - 1, day);
  holidayDate.setHours(0, 0, 0, 0);

  const preDays = parseInt(pre, 10) || 0;
  const postDays = parseInt(post, 10) || 0;

  var windowStart, windowEnd;
  windowStart = new Date(holidayDate);
  windowStart.setDate(holidayDate.getDate() - preDays);

  windowEnd = new Date(holidayDate);
  windowEnd.setDate(holidayDate.getDate() + postDays);
  windowEnd.setHours(23, 59, 59, 999);

  if (today < windowStart) {
    windowStart.setFullYear(windowStart.getFullYear() - 1);
    windowEnd.setFullYear(windowEnd.getFullYear() - 1);
  }
  if (today > windowEnd) {
    windowStart.setFullYear(windowStart.getFullYear() + 1);
    windowEnd.setFullYear(windowEnd.getFullYear() + 1);
  }

  if (!isCal)
    console.debug(
      `${LOG_TAG} [HOLIDAY] Window check: today ${today.toISOString().split("T")[0]} vs ${windowStart.toISOString().split("T")[0]} – ${windowEnd.toISOString().split("T")[0]}`,
    );
  return today >= windowStart && today <= windowEnd;
}

async function saveId(id) {
  var settingsCopy = { ...settings };

  settingsCopy.currentSeq = id;

  fs.writeFileSync("/config/settings.js", JSON.stringify(settingsCopy));
}

async function checkSchedule(forceDate = null, isCal = false) {
  if (!isCal)
    console.debug(`${LOG_TAG} Starting schedule check ${forceDate ? `(forced: ${forceDate})` : "(current day)"}`);
  let bestIndex = -1;
  let bestPriority = Infinity;

  const today = forceDate ? new Date(forceDate + "T00:00:00") : new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  const todayNumber = new Date(Date.UTC(currentYear, today.getMonth(), today.getDate())).getTime();
  const jsDay = today.getDay();
  const bitForToday = 1 << (jsDay === 0 ? 6 : jsDay - 1); //adjusting for discrepency between indexes of today.getDay and PR+

  for (let idx = 0; idx < settings.sequences.length; idx++) {
    const element = settings.sequences[idx];
    const priority = element.priority ? parseInt(element.priority, 10) : Infinity;

    let isMatch = false;

    if (!isCal)
      console.debug(
        `${LOG_TAG} Evaluating sequence #${idx}: "${element.name || "unnamed"}" (priority ${priority}, type ${element.schedule})`,
      );

    if (element.schedule === "3") {
      if (!isCal) console.debug(`${LOG_TAG} → Checking holiday: ${element.holiday} (${element.country})`);
      const isHoliday = await isHolidayDay(
        element.country,
        element.holiday,
        element.states,
        element.type,
        element.holidaySource,
        settings.settings.apiKey,
        forceDate,
        element.preHoliday || "0",
        element.postHoliday || "0",
        isCal,
      );
      if (isHoliday) {
        isMatch = true;
        if (!isCal) console.info(`${LOG_TAG} → Holiday match: ${element.holiday}`);
      }
    } else if (element.schedule === "4") {
      const daysMask = parseInt(element.days, 10) || 0;
      if (!isCal)
        console.debug(
          `${LOG_TAG} → Checking days mask: ${daysMask.toString(2).padStart(7, "0")} vs today bit ${bitForToday.toString(2)}`,
        );
      if ((daysMask & bitForToday) !== 0) {
        isMatch = true;
        if (!isCal) console.info(`${LOG_TAG} → Days match for sequence "${element.name || "unnamed"}"`);
      }
    } else if (element.schedule === "2") {
      isMatch = true;
      if (!isCal) console.info(`${LOG_TAG} → Fallback sequence matched`);
    } else {
      const startNumber = new Date(Date.UTC(currentYear, element.startMonth - 1, element.startDay)).getTime();
      const endNumber = new Date(Date.UTC(currentYear, element.endMonth - 1, element.endDay)).getTime();
      const isWrapped = startNumber > endNumber;

      if (
        (isWrapped && (todayNumber >= startNumber || todayNumber <= endNumber)) ||
        (!isWrapped && todayNumber >= startNumber && todayNumber <= endNumber)
      ) {
        isMatch = true;
        if (!isCal)
          console.info(
            `${LOG_TAG} → Date range match: ${element.startMonth}/${element.startDay} - ${element.endMonth}/${element.endDay}`,
          );
      }
    }

    if (isMatch) {
      if (!isCal) console.debug(`${LOG_TAG} → Match found - priority ${priority} (current best: ${bestPriority})`);
      if (priority < bestPriority) {
        bestPriority = priority;
        bestIndex = idx;
      } else if (priority === Infinity && bestPriority === Infinity && bestIndex === -1) {
        bestIndex = idx;
        if (!isCal) console.info(`${LOG_TAG} → New best match: "${element.name || "unnamed"}" (priority ${priority})`);
      }
    }
  }
  if (!isCal)
    console.info(
      `${LOG_TAG} Schedule check complete - selected index ${bestIndex} (${bestIndex !== -1 ? settings.sequences[bestIndex].name || "unnamed" : "none"})`,
    );
  if (!forceDate) await saveId(bestIndex !== -1 ? settings.sequences[bestIndex].id : "");
  return bestIndex;
}

async function createList(index) {
  console.debug(`${LOG_TAG} Building preroll list for sequence index ${index}`);

  let plexString = "";
  if (index !== -1) {
    const seqName = settings.sequences[index].name || "unnamed";
    console.info(`${LOG_TAG} Using sequence: ${seqName}`);

    const bucketIds = settings.sequences[index].buckets;
    let usedFiles = new Set();

    for (const [idx, bucketId] of bucketIds.entries()) {
      let files = [];
      const info = settings.buckets.find(({ id }) => id === bucketId.id.toString());

      if (info.source === "2") {
        try {
          const response = await axios.post(
            `http://localhost:${getActivePort()}/backend/directory`,
            { dir: `${info.dir}`, isSub: info.includeSub || false },
            {
              headers: {
                "Content-Type": "application/json;charset=UTF-8",
              },
            },
          );
          response.data.forEach((media) => {
            if (!media.isDir)
              files.push(`${settings.settings.plexLoc}${media.path.replace(settings.settings.loc, "")}/${media.name}`);
          });
        } catch (error) {
          if (error.response) {
            console.error(`${LOG_TAG} Server responded with error: ${error.response.data}`);
          } else if (error.request) {
            console.error(`${LOG_TAG} No response received: ${error.request}`);
          } else {
            console.error(`${LOG_TAG} Error setting up request: ${error.message}`);
          }
        }
      } else {
        info.media.forEach((media) => {
          files.push(`${settings.settings.plexLoc}${media.dir}/${media.file}`);
        });
      }

      if (files.length !== 0) {
        let randomFile;
        do {
          randomFile = files[Math.floor(Math.random() * files.length)];
        } while (usedFiles.has(randomFile));
        usedFiles.add(randomFile);

        if (idx === bucketIds.length - 1) {
          plexString += randomFile;
        } else {
          plexString += randomFile + ",";
        }
      }
    }
    console.log(`${LOG_TAG} Updating using Sequence: ${settings.sequences[index].name}`);
    console.debug(
      `${LOG_TAG} Generated preroll string (${plexString.split(",").length} files, ${plexString.length} chars)`,
    );
  } else {
    console.debug(`${LOG_TAG} No sequence selected - empty preroll string`);
  }

  return plexString;
}

async function sendList(string) {
  const url = `http${settings.settings.ssl ? "s" : ""}://${settings.settings.ip}:${settings.settings.port}/:/prefs`;
  console.debug(`${LOG_TAG} Sending Plex update to ${url} (string length: ${string.length})`);

  try {
    await axios.put(url, null, {
      headers: {
        "X-Plex-Token": `${settings.token}`,
      },
      params: {
        CinemaTrailersPrerollID: string,
      },
    });

    console.info(
      string === ""
        ? `${LOG_TAG} Plex preroll cleared successfully`
        : `${LOG_TAG} Plex preroll updated successfully: ${string} (${string.split(",").length} files)`,
    );
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.warn(
        `${LOG_TAG} Plex returned 401 Unauthorized → token likely invalid. Please log in via the webpage to create a valid token.`,
      );
      settings.isLoggedIn = "false";

      const settingsToSave = { ...settings };

      try {
        await axios.post(`http://localhost:${getActivePort()}/backend/save`, settingsToSave, {
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (saveError) {
        console.error(`${LOG_TAG} Failed to save settings after 401: ${saveError.message}`);
      }
    } else {
      console.error(`${LOG_TAG} Error updating preroll: ${error.message || error}`);
    }
  }
}

async function doTask() {
  const index = await checkSchedule();
  const string = await createList(index);
  sendList(string);
}

function getDelayUntilTargetTime(hour = 0, minute = 0) {
  const now = new Date();
  const targetTime = new Date();

  targetTime.setHours(hour, minute, 0, 0);

  if (targetTime <= now) {
    targetTime.setDate(targetTime.getDate() + 1);
  }

  const delayMs = targetTime - now;
  console.debug(
    `${LOG_TAG} Calculated delay: ${Math.round(delayMs / 60000)} minutes (target: ${targetTime.toISOString()})`,
  );

  return targetTime - now;
}

function myAsyncTask() {
  try {
    settings = JSON.parse(fs.readFileSync(filePath));

    console.log(`${LOG_TAG} Daily task started...`);
    doTask()
      .then(() => {
        console.debug(`${LOG_TAG} Daily task completed successfully`);
      })
      .catch((err) => {
        console.error(`${LOG_TAG} Daily task failed: ${err.message}`);
      });
  } catch (error) {
    console.error(`${LOG_TAG} Failed to load settings for daily task: ${error.message}`);
  }
}

router.post("/", upload.single("thumb"), async function (req, res, next) {
  let payload;
  try {
    payload = JSON.parse(req.body.payload);
    console.debug(`${LOG_TAG} Webhook received - event: ${payload.event}, type: ${payload.Metadata?.type}`);
  } catch (e) {
    console.warn(`${LOG_TAG} Invalid webhook payload: ${e.message}`);
    return res.sendStatus(200);
  }

  settings = JSON.parse(fs.readFileSync(filePath));

  try {
    if (payload.event === "media.play" && payload.Metadata.type === "movie") {
      console.info(`${LOG_TAG} Movie playback detected - triggering preroll update`);
      await doTask();
      console.debug(`${LOG_TAG} Preroll update triggered from webhook`);
    }
    res.sendStatus(200);
  } catch (e) {
    console.error(`${LOG_TAG} Webhook processing error: ${e.message}`);
    res.sendStatus(200); // still ack to Plex
  }
});

router.get("/", function (req, res, next) {
  settings = JSON.parse(fs.readFileSync(filePath));
  console.debug(`${LOG_TAG} Manual preroll update triggered`);
  doTask();

  res.sendStatus(200);
});

router.get("/calendar", async (req, res) => {
  const { year, month } = req.query;
  console.debug(`${LOG_TAG} Calendar request: year=${year}, month=${month}`);

  if (!year || !month) {
    return res.status(400).json({ error: "year and month required" });
  }

  const y = parseInt(year, 10);
  const m = parseInt(month, 10) - 1;

  const events = [];

  const bucketMap = {};
  settings.buckets.forEach((bucket) => {
    bucketMap[bucket.id] = bucket.name;
  });

  let currentDate = new Date(Date.UTC(y, m, 1));
  const endDate = new Date(Date.UTC(y, m + 1, 0));

  console.log(
    `${LOG_TAG} Fetching calendar: ${year}-${month} (${currentDate.toISOString().split("T")[0]} to ${
      endDate.toISOString().split("T")[0]
    })`,
  );

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];

    const index = await checkSchedule(dateStr, true);
    const seq = index !== -1 ? settings.sequences[index] : null;

    if (seq && Array.isArray(seq.buckets) && seq.buckets.length > 0) {
      const bucketNames = seq.buckets
        .map((b) => (typeof b === "object" && b.id ? bucketMap[b.id] : null))
        .filter(Boolean);

      events.push({
        title: seq.name,
        date: dateStr,
        buckets: bucketNames,
      });
    }

    currentDate = new Date(
      Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate() + 1),
    );
  }

  console.info(`${LOG_TAG} Calendar generated: ${events.length} events for ${year}-${month}`);

  res.json(events);
});

// Schedule the initial run
const delay = getDelayUntilTargetTime(hours, minutes);
console.info(
  `${LOG_TAG} Scheduler initialized - daily update at ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} (delay: ${Math.round(delay / 60000)} minutes)`,
);
// Set the task to run every day
setTimeout(() => {
  myAsyncTask();

  setInterval(myAsyncTask, 24 * 60 * 60 * 1000);
}, delay);

module.exports = router;
