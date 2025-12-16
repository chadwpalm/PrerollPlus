var express = require("express");
var router = express.Router();
var multer = require("multer");
var fs = require("fs");
var path = require("path");
var axios = require("axios").default;

// Global Variables

var flag = false;

var upload = multer({ dest: "/tmp/" });

const filePath = "/config/settings.js";

var settings;

// General Functions

async function isHolidayDay(country, holiday, states, type, source, apiKey, checkDate = null, pre = "0", post = "0") {
  const cacheDir = path.join("/", "config", "cache");
  const HolidayType = {
    1: "national",
    2: "local",
    3: "religious",
    4: "observance",
  };
  const typeName = HolidayType[parseInt(type, 10)];

  const today = checkDate
    ? new Date(
        Date.UTC(
          Number(checkDate.split("-")[0]), // year
          Number(checkDate.split("-")[1]) - 1, // month (0-based)
          Number(checkDate.split("-")[2]) // day
        )
      )
    : new Date();
  today.setUTCHours(0, 0, 0, 0);
  const currentYear = today.getUTCFullYear();

  let rawData, cacheFile;
  if (source === "2") {
    cacheFile = path.join(cacheDir, `${country}-calendarific-${typeName}-${currentYear}.json`);
  }

  if (source === "2" && fs.existsSync(cacheFile)) {
    rawData = fs.readFileSync(cacheFile, "utf-8");
  } else {
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
    console.log("Holiday not found:", holiday);
    return false;
  }

  const holidayDateStr = source === "2" ? data.date.iso : data.date;
  const [datePart] = holidayDateStr.split("T");
  const [year, month, day] = datePart.split("-").map(Number);

  const holidayDate = new Date(Date.UTC(year, month - 1, day));
  holidayDate.setUTCHours(0, 0, 0, 0);

  const preDays = parseInt(pre, 10) || 0;
  const postDays = parseInt(post, 10) || 0;

  var windowStart, windowEnd;

  windowStart = new Date(holidayDate);
  windowStart.setUTCDate(holidayDate.getUTCDate() - preDays);

  windowEnd = new Date(holidayDate);
  windowEnd.setUTCDate(holidayDate.getUTCDate() + postDays);
  windowEnd.setUTCHours(23, 59, 59, 999);

  if (today < windowStart) {
    windowStart.setFullYear(windowStart.getFullYear() - 1);
    windowEnd.setFullYear(windowEnd.getFullYear() - 1);
  }
  if (today > windowEnd) {
    windowStart.setFullYear(windowStart.getFullYear() + 1);
    windowEnd.setFullYear(windowEnd.getFullYear() + 1);
  }

  return today >= windowStart && today <= windowEnd;
}

async function saveId(id) {
  var settingsCopy = { ...settings };

  settingsCopy.currentSeq = id;

  fs.writeFileSync("/config/settings.js", JSON.stringify(settingsCopy));
}

async function checkSchedule(forceDate = null) {
  let bestIndex = -1;
  let bestPriority = Infinity; // smaller number is higher priority
  const today = forceDate ? new Date(forceDate + "T00:00:00") : new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();

  const todayNumber = new Date(Date.UTC(currentYear, today.getMonth(), today.getDate())).getTime();

  for (let idx = 0; idx < settings.sequences.length; idx++) {
    const element = settings.sequences[idx];
    const priority = element.priority ? parseInt(element.priority, 10) : Infinity;

    let isMatch = false;

    if (element.schedule === "3") {
      // Holiday
      const isHoliday = await isHolidayDay(
        element.country,
        element.holiday,
        element.states,
        element.type,
        element.holidaySource,
        settings.settings.apiKey,
        forceDate,
        element.preHoliday || "0",
        element.postHoliday || "0"
      );
      if (isHoliday) isMatch = true;
    } else if (element.schedule === "2") {
      // Fallback
      isMatch = true;
    } else {
      // Date range
      const startNumber = new Date(Date.UTC(currentYear, element.startMonth - 1, element.startDay)).getTime();
      const endNumber = new Date(Date.UTC(currentYear, element.endMonth - 1, element.endDay)).getTime();
      const isWrapped = startNumber > endNumber;

      if (
        (isWrapped && (todayNumber >= startNumber || todayNumber <= endNumber)) ||
        (!isWrapped && todayNumber >= startNumber && todayNumber <= endNumber)
      ) {
        isMatch = true;
      }
    }

    // If this element matches and has a better (smaller) priority
    if (isMatch) {
      if (priority < bestPriority) {
        // Pick higher-priority sequence
        bestPriority = priority;
        bestIndex = idx;
      } else if (priority === Infinity && bestPriority === Infinity && bestIndex === -1) {
        // No priorities set anywhere, fall back to first match
        bestIndex = idx;
      }
    }
  }
  if (!forceDate) await saveId(bestIndex !== -1 ? settings.sequences[bestIndex].id : "");
  return bestIndex;
}

async function createList(index) {
  let plexString = "";
  if (index !== -1) {
    const bucketIds = settings.sequences[index].buckets;
    let usedFiles = new Set(); // Set to keep track of used files

    // Using `for...of` loop to await `axios` inside the loop
    for (const [idx, bucketId] of bucketIds.entries()) {
      let files = [];
      const info = settings.buckets.find(({ id }) => id === bucketId.id.toString());

      if (info.source === "2") {
        try {
          const response = await axios.post(
            "http://localhost:4949/backend/directory",
            { dir: `${info.dir}` },
            {
              headers: {
                "Content-Type": "application/json;charset=UTF-8",
              },
            }
          );
          response.data.forEach((media) => {
            if (!media.isDir)
              files.push(`${settings.settings.plexLoc}${info.dir.replace(settings.settings.loc, "")}/${media.name}`);
          });
        } catch (error) {
          if (error.response) {
            console.error("Server responded with error:", error.response.data);
          } else if (error.request) {
            console.error("No response received:", error.request);
          } else {
            console.error("Error setting up request:", error.message);
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
          randomFile = files[Math.floor(Math.random() * files.length)]; // Fix: `info.media.length` -> `files.length`
        } while (usedFiles.has(randomFile)); // Keep picking until an unused file is found

        usedFiles.add(randomFile); // Mark the selected file as used

        if (idx === bucketIds.length - 1) {
          plexString += randomFile;
        } else {
          plexString += randomFile + ",";
        }
      }
    }
  }
  console.log("Updating using Sequence: ", settings.sequences[index].name);
  return plexString;
}

async function sendList(string) {
  const url = `http${settings.settings.ssl ? "s" : ""}://${settings.settings.ip}:${settings.settings.port}/:/prefs`;

  await axios
    .put(url, null, {
      headers: {
        "X-Plex-Token": `${settings.token}`,
      },
      params: {
        CinemaTrailersPrerollID: string,
      },
    })
    .then((response) => {
      string === ""
        ? console.log("No string to update in Plex")
        : console.log("Preroll updated successfully: ", string);
    })
    .catch((error) => {
      console.error("Error updating preroll:", error);
    });
}

async function doTask() {
  const index = await checkSchedule();
  const string = await createList(index);
  sendList(string);
}

// Function to calculate delay until the desired time (3:00 PM)
function getDelayUntilTargetTime(hour, minute) {
  const now = new Date();
  const targetTime = new Date();

  targetTime.setHours(hour, minute, 0, 0); // Set target time to 3:00 PM today

  if (targetTime <= now) {
    // If the target time has already passed today, schedule for tomorrow
    targetTime.setDate(targetTime.getDate() + 1);
  }

  // Calculate the delay in milliseconds
  return targetTime - now;
}

// Periodic Task to Check Schedules
function myAsyncTask() {
  try {
    settings = JSON.parse(fs.readFileSync(filePath));
    // Your async code here
    console.log("Task running...");
    doTask();
  } catch (error) {
    console.error("Error in async task:", error);
  }
}

router.post("/", upload.single("thumb"), async function (req, res, next) {
  var payload = JSON.parse(req.body.payload);
  settings = JSON.parse(fs.readFileSync(filePath));

  try {
    if (payload.event === "media.play" && payload.Metadata.type === "movie") {
      console.info("Movie has started. Updating prerolls");

      doTask();
    }
    res.sendStatus(200);
  } catch (e) {
    console.log("There was an error", e);
    res.sendStatus(200);
  }
});

router.get("/", function (req, res, next) {
  settings = JSON.parse(fs.readFileSync(filePath));

  doTask();

  res.sendStatus(200);
});

router.get("/calendar", async (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) {
    return res.status(400).json({ error: "year and month required" });
  }

  const y = parseInt(year, 10);
  const m = parseInt(month, 10) - 1; // JS months are 0-based

  const events = [];

  // Build bucket ID → name lookup map (once per request)
  const bucketMap = {};
  settings.buckets.forEach((bucket) => {
    bucketMap[bucket.id] = bucket.name;
  });

  // Start and end of the requested month (UTC)
  let currentDate = new Date(Date.UTC(y, m, 1));
  const endDate = new Date(Date.UTC(y, m + 1, 0)); // Last day of month

  console.log(
    `Fetching calendar: ${year}-${month} (${currentDate.toISOString().split("T")[0]} to ${
      endDate.toISOString().split("T")[0]
    })`
  );

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];

    // DEBUG: See every date being processed
    // console.log("Processing:", dateStr);

    const index = await checkSchedule(dateStr);
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

    // Move to next day — safely, without mutation bugs
    currentDate = new Date(
      Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate() + 1)
    );
  }

  console.log(`Returning ${events.length} events for ${year}-${month}`);
  // console.log(JSON.stringify(events, null, 2)); // Pretty print for debugging

  res.json(events);
});

// Schedule the initial run
const delay = getDelayUntilTargetTime(0, 0);
// Set the task to run every day
setTimeout(() => {
  myAsyncTask();

  setInterval(myAsyncTask, 24 * 60 * 60 * 1000);
}, delay);

module.exports = router;
