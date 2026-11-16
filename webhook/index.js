var express = require("express");
var router = express.Router();
var multer = require("multer");
var axios = require("axios").default;
const store = require("../backend/settingsStore");
const { getHolidayData } = require("../backend/holidays");
const { listDirectory } = require("../backend/directory");
const log = require("../backend/logger").tagged("WEBHOOK");
const schedLog = require("../backend/logger").tagged("SCHEDULE");

// Plex attaches a thumbnail image to some webhooks. It isn't used, so it is dropped instead of saved to disk.
var upload = multer({ fileFilter: (req, file, cb) => cb(null, false) });

// Settings used while working out the schedule. Re-read from disk at the start of every update, webhook
// and calendar request. Changes are written through the settings store (never by saving this whole copy),
// so edits saved in the meantime are never overwritten.
var settings;

function loadSettings() {
  settings = store.read();
  return settings;
}

const [hours, minutes] = (process.env.SCHEDULE_TIME?.split(":") || ["0", "0"]).map((part) => parseInt(part, 10) || 0);

// General Functions

function getOverrideSequenceIndex(forceDate = null) {
  const ovr = settings.currentOverride;
  if (!ovr || !ovr.id) {
    return -1;
  }

  if (ovr.endTimestamp === null) {
    if (forceDate) {
      const dayToCheck = new Date(forceDate + "T00:00:00");
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      if (dayToCheck < todayStart) {
        return -1;
      }
    }
    if (!forceDate) {
      schedLog.debug(`Override active indefinitely (sequence ID ${ovr.id})`);
    }
    return settings.sequences.findIndex((seq) => seq.id === ovr.id);
  }

  if (forceDate) {
    const dayToCheck = new Date(forceDate + "T00:00:00");
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (dayToCheck < todayStart) {
      return -1;
    }

    const endOfDay = new Date(forceDate + "T23:59:59.999");
    const checkTime = endOfDay.getTime();

    if (checkTime < ovr.endTimestamp) {
      return settings.sequences.findIndex((seq) => seq.id === ovr.id);
    } else {
      return -1;
    }
  } else {
    const now = Date.now();
    if (now < ovr.endTimestamp) {
      schedLog.debug(`Override active until ${new Date(ovr.endTimestamp).toLocaleString()} (sequence ID ${ovr.id})`);
      return settings.sequences.findIndex((seq) => seq.id === ovr.id);
    } else {
      schedLog.debug("Timed override has expired");
      return -1;
    }
  }
}

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
  const today = checkDate
    ? new Date(Number(checkDate.split("-")[0]), Number(checkDate.split("-")[1]) - 1, Number(checkDate.split("-")[2]))
    : new Date();
  today.setHours(0, 0, 0, 0);

  const parsed = await getHolidayData({
    country,
    source,
    type,
    year: today.getFullYear(),
    apiKey,
    timeout: 2000,
    quiet: isCal,
  });
  if (!parsed) return false;

  let data;
  if (source === "2") {
    data = parsed.response?.holidays?.find((item) => item.name === holiday && item.locations === states);
  } else if (source === "1") {
    data = parsed.find?.((item) => {
      const stateString = item.counties === null ? "All" : item.counties.join(", ");
      return item.name === holiday && stateString === states;
    });
  }

  if (!data) {
    schedLog.warn(`Holiday "${holiday}" not found in the ${country} holiday list`);
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
    schedLog.debug(
      `  Holiday window ${windowStart.toISOString().split("T")[0]} to ${windowEnd.toISOString().split("T")[0]}, today ${today.toISOString().split("T")[0]}`,
    );
  return today >= windowStart && today <= windowEnd;
}

// Remember today's sequence (shown with a blue border on the Sequences page)
function saveId(id) {
  settings.currentSeq = id;
  store.update((s) => {
    s.currentSeq = id;
  });
}

async function checkSchedule(forceDate = null, isCal = false) {
  if (!isCal) schedLog.debug(`Checking schedule for ${forceDate || "today"}`);

  const overrideIndex = getOverrideSequenceIndex(forceDate);

  if (overrideIndex !== -1) {
    if (!isCal) {
      const seqName = settings.sequences[overrideIndex]?.name || "unnamed";
      schedLog.info(`Override active, using sequence "${seqName}"`);
    }
    if (!forceDate && !isCal) {
      saveId(settings.sequences[overrideIndex].id);
    }
    return overrideIndex;
  }

  let bestIndex = -1;
  let bestPriority = Infinity;

  const today = forceDate ? new Date(forceDate + "T00:00:00") : new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  const todayNumber = new Date(Date.UTC(currentYear, today.getMonth(), today.getDate())).getTime();
  const jsDay = today.getDay();
  const bitForToday = 1 << (jsDay === 0 ? 6 : jsDay - 1); //adjusting for discrepancy between indexes of today.getDay and PR+

  for (let idx = 0; idx < settings.sequences.length; idx++) {
    const element = settings.sequences[idx];
    const priority = element.priority ? parseInt(element.priority, 10) : Infinity;

    let isMatch = false;

    if (!isCal) schedLog.debug(`"${element.name || "unnamed"}" (priority ${priority}):`);

    if (element.schedule === "3") {
      if (!isCal) schedLog.debug(`  Holiday ${element.holiday} (${element.country})`);
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
        if (!isCal) schedLog.debug("  Matches (holiday)");
      }
    } else if (element.schedule === "4") {
      const daysMask = parseInt(element.days, 10) || 0;
      if (!isCal)
        schedLog.debug(`  Days of week ${daysMask.toString(2).padStart(7, "0")}, today ${bitForToday.toString(2)}`);
      if ((daysMask & bitForToday) !== 0) {
        isMatch = true;
        if (!isCal) schedLog.debug("  Matches (day of week)");
      }
    } else if (element.schedule === "2") {
      isMatch = true;
      if (!isCal) schedLog.debug("  Matches (no schedule, always eligible)");
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
          schedLog.debug(
            `  Matches (dates ${element.startMonth}/${element.startDay} - ${element.endMonth}/${element.endDay})`,
          );
      }
    }

    if (isMatch) {
      if (priority < bestPriority) {
        bestPriority = priority;
        bestIndex = idx;
      } else if (priority === Infinity && bestPriority === Infinity && bestIndex === -1) {
        bestIndex = idx;
      }
    }
  }
  if (!isCal && !forceDate)
    schedLog.info(
      bestIndex !== -1
        ? `Today's sequence is "${settings.sequences[bestIndex].name || "unnamed"}"`
        : "No sequence is scheduled for today",
    );
  if (!forceDate) saveId(bestIndex !== -1 ? settings.sequences[bestIndex].id : "");
  return bestIndex;
}

async function createList(index) {
  const picked = [];
  if (index !== -1) {
    const bucketIds = settings.sequences[index].buckets;
    let usedFiles = new Set();

    for (const bucketId of bucketIds) {
      let files = [];
      const info = settings.buckets.find(({ id }) => id === bucketId.id.toString());
      if (!info) {
        log.warn(`Sequence "${settings.sequences[index].name}" uses a bucket that no longer exists, skipping it`);
        continue;
      }

      if (info.source === "2") {
        try {
          (listDirectory(info.dir, info.includeSub || false) ?? []).forEach((media) => {
            if (!media.isDir)
              files.push(`${settings.settings.plexLoc}${media.path.replace(settings.settings.loc, "")}/${media.name}`);
          });
        } catch (error) {
          log.error(`Could not list folder ${info.dir} for bucket "${info.name}":`, error.message);
        }
      } else {
        info.media.forEach((media) => {
          files.push(`${settings.settings.plexLoc}${media.dir}/${media.file}`);
        });
      }

      // Pick only from files not already used earlier in this list, so nothing plays twice
      const unused = files.filter((file) => !usedFiles.has(file));
      if (files.length === 0) {
        log.warn(`Bucket "${info.name}" has no files, skipping it`);
      } else if (unused.length === 0) {
        log.warn(`Bucket "${info.name}": all of its files were already picked for earlier buckets, skipping it`);
      } else {
        const randomFile = unused[Math.floor(Math.random() * unused.length)];
        usedFiles.add(randomFile);
        picked.push(randomFile);
      }
    }
    log.debug(`Picked prerolls: ${picked.join(",")}`);
  }

  // Joined at the end so a skipped last bucket never leaves a trailing comma
  return picked.join(",");
}

async function sendList(string, seqName) {
  const url = `http${settings.settings.ssl ? "s" : ""}://${settings.settings.ip}:${settings.settings.port}/:/prefs`;

  try {
    await axios.put(url, null, {
      headers: {
        "X-Plex-Token": `${settings.token}`,
      },
      params: {
        CinemaTrailersPrerollID: string,
      },
    });

    log.info(
      string === ""
        ? "Cleared the Plex preroll setting"
        : `Updated Plex with ${string.split(",").length} preroll(s)${seqName ? ` from "${seqName}"` : ""}`,
    );
  } catch (error) {
    if (error.response && error.response.status === 401) {
      log.warn("Plex rejected the login token (401). Sign in to Preroll Plus again to get a new token.");
      try {
        // The pages show the Plex sign-in until the owner signs in again (backend/auth.js)
        store.update((s) => {
          s.plexSignInNeeded = true;
        });
      } catch (saveError) {
        log.error("Could not save the signed-out state:", saveError);
      }
    } else {
      log.error("Could not update the Plex preroll setting:", error);
    }
  }
}

async function doTask() {
  const index = await checkSchedule();
  const string = await createList(index);
  await sendList(string, index !== -1 ? settings.sequences[index].name : null);
}

function getDelayUntilTargetTime(hour = 0, minute = 0) {
  const now = new Date();
  const targetTime = new Date();

  targetTime.setHours(hour, minute, 0, 0);

  if (targetTime <= now) {
    targetTime.setDate(targetTime.getDate() + 1);
  }

  return targetTime - now;
}

let overrideExpirationTimer = null;

function clearOverrideExpirationTimer() {
  if (overrideExpirationTimer) {
    clearTimeout(overrideExpirationTimer);
    overrideExpirationTimer = null;
  }
}

// Clears an override that has ended, unless it was changed or removed in the meantime
function endOverride(id) {
  store.update((s) => {
    if (s.currentOverride?.id === id) s.currentOverride = { id: null, endTimestamp: null };
  });
}

/** (Re)start the timer that ends a timed override. Called on startup, after every settings save, and by updates. */
function scheduleOverrideExpiration() {
  clearOverrideExpirationTimer();

  let ovr;
  try {
    ovr = store.read().currentOverride;
  } catch (err) {
    schedLog.error("Override timer: could not read settings:", err);
    return;
  }

  if (!ovr || !ovr.id || ovr.endTimestamp === null || ovr.endTimestamp === undefined) {
    return;
  }

  const delayMs = ovr.endTimestamp - Date.now();

  if (delayMs <= 0) {
    schedLog.info("Override has expired, returning to the normal schedule");
    endOverride(ovr.id);
    updatePrerolls().catch((err) => schedLog.error("Sequence update after the override ended failed:", err));
    return;
  }

  schedLog.info(
    `Override ends ${new Date(ovr.endTimestamp).toLocaleString()} (in ${Math.round(delayMs / 60000)} minutes)`,
  );

  overrideExpirationTimer = setTimeout(() => {
    overrideExpirationTimer = null;
    schedLog.info("Override has ended, returning to the normal schedule");
    endOverride(ovr.id);
    updatePrerolls().catch((err) => schedLog.error("Sequence update after the override ended failed:", err));
  }, delayMs);
}

/** Pick today's sequence and send a new preroll list to Plex, using the latest saved settings. */
async function updatePrerolls() {
  loadSettings();
  scheduleOverrideExpiration();
  await doTask();
}

function myAsyncTask() {
  schedLog.info("Daily sequence update");
  updatePrerolls().catch((err) => {
    schedLog.error("Daily sequence update failed:", err);
  });
}

router.post("/", upload.single("thumb"), async function (req, res, next) {
  let payload;
  try {
    payload = JSON.parse(req.body.payload);
    log.debug(`Plex webhook: ${payload.event} (${payload.Metadata?.type ?? "no media type"})`);
  } catch (e) {
    log.warn("Ignoring a webhook with an invalid payload:", e.message);
    return res.sendStatus(200);
  }

  try {
    if (payload.event === "media.play" && payload.Metadata?.type === "movie") {
      log.info(`Movie started${payload.Metadata.title ? ` ("${payload.Metadata.title}")` : ""}, picking new prerolls`);
      await updatePrerolls();
    }
    res.sendStatus(200);
  } catch (e) {
    log.error("Webhook processing failed:", e);
    res.sendStatus(200);
  }
});

// The web pages call this after saving, so Plex gets prerolls from the new settings right away
router.get("/", async function (req, res, next) {
  try {
    await updatePrerolls();
  } catch (err) {
    log.error("Preroll update failed:", err);
  }
  res.sendStatus(200);
});

// Returns the sequence scheduled for each day between startStr and endStr (inclusive, "YYYY-MM-DD").
// Shared by the Calendar page (/webhook/calendar) and the iCal feed (/feed).
async function getCalendarEvents(startStr, endStr) {
  const events = [];
  loadSettings();

  const bucketMap = {};
  settings.buckets.forEach((bucket) => {
    bucketMap[bucket.id] = bucket.name;
  });

  let currentDate = new Date(startStr + "T00:00:00Z");
  const endDate = new Date(endStr + "T00:00:00Z");

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];

    const index = await checkSchedule(dateStr, true);
    const seq = index !== -1 ? settings.sequences[index] : null;

    if (seq && Array.isArray(seq.buckets) && seq.buckets.length > 0) {
      const bucketNames = seq.buckets
        .map((b) => (typeof b === "object" && b.id ? bucketMap[b.id] : null))
        .filter(Boolean);

      events.push({
        id: seq.id,
        title: seq.name,
        date: dateStr,
        buckets: bucketNames,
      });
    }

    currentDate = new Date(
      Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate() + 1),
    );
  }

  return events;
}

router.get("/calendar", async (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) {
    return res.status(400).json({ error: "year and month required" });
  }

  const y = parseInt(year, 10);
  const m = parseInt(month, 10) - 1;

  const startStr = new Date(Date.UTC(y, m, 1)).toISOString().split("T")[0];
  const endStr = new Date(Date.UTC(y, m + 1, 0)).toISOString().split("T")[0];

  const events = await getCalendarEvents(startStr, endStr);

  log.debug(`Calendar for ${year}-${month}: ${events.length} day(s) with a sequence`);

  res.json(events);
});

// Daily sequence update. The delay is worked out again after every run (instead of a fixed 24-hour
// interval) so it stays at the same local time across daylight saving changes.
function scheduleDailyTask() {
  // At least a minute, so a timer that fires a moment early can't run the task twice
  const delay = Math.max(getDelayUntilTargetTime(hours, minutes), 60 * 1000);
  schedLog.debug(`Next daily sequence update in ${Math.round(delay / 60000)} minutes`);
  setTimeout(() => {
    myAsyncTask();
    scheduleDailyTask();
  }, delay);
}

schedLog.info(
  `Daily sequence update at ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} (next in ${Math.round(getDelayUntilTargetTime(hours, minutes) / 60000)} minutes)`,
);
scheduleDailyTask();

module.exports = router;
module.exports.getCalendarEvents = getCalendarEvents;
module.exports.updatePrerolls = updatePrerolls;
module.exports.scheduleOverrideExpiration = scheduleOverrideExpiration;
