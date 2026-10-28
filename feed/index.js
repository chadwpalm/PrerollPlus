var express = require("express");
var router = express.Router();
var fs = require("fs");
var crypto = require("crypto");
const ical = require("ical-generator").default;
const { getCalendarEvents } = require("../webhook/index");

// Global Variables

const LOG_TAG = "[FEED]";

const filePath = "/config/settings.js";

const DEFAULT_PAST_DAYS = 30;
const MAX_PAST_DAYS = 30;
const DEFAULT_FUTURE_DAYS = 183;
const MAX_FUTURE_DAYS = 365;

// General Functions

function isValidApiKey(provided) {
  let mainApiKey;
  try {
    mainApiKey = JSON.parse(fs.readFileSync(filePath)).mainApiKey;
  } catch (err) {
    console.error(`${LOG_TAG} Failed to read settings: ${err.message}`);
    return false;
  }

  if (!mainApiKey || typeof provided !== "string") return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(mainApiKey);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function parseDays(value, defaultDays, maxDays) {
  const days = parseInt(value, 10);
  if (isNaN(days) || days < 0) return defaultDays;
  return Math.min(days, maxDays);
}

// Local "YYYY-MM-DD" offset from today, matching how checkSchedule interprets dates
function localDateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function nextDateStr(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}

// Collapse consecutive days running the same sequence into a single multi-day event
function mergeDays(days) {
  const merged = [];

  days.forEach((day) => {
    const last = merged[merged.length - 1];
    if (last && last.id === day.id && nextDateStr(last.end) === day.date) {
      last.end = day.date;
    } else {
      merged.push({ id: day.id, title: day.title, start: day.date, end: day.date, buckets: day.buckets });
    }
  });

  return merged;
}

router.get("/calendar/PrerollPlus.ics", async (req, res) => {
  if (!isValidApiKey(req.query.apikey)) {
    console.warn(`${LOG_TAG} Calendar feed request rejected: invalid or missing API key`);
    return res.status(401).type("text/plain").send("Unauthorized");
  }

  const pastDays = parseDays(req.query.pastDays, DEFAULT_PAST_DAYS, MAX_PAST_DAYS);
  const futureDays = parseDays(req.query.futureDays, DEFAULT_FUTURE_DAYS, MAX_FUTURE_DAYS);
  const includeBuckets = req.query.buckets === "true";

  const startStr = localDateStr(-pastDays);
  const endStr = localDateStr(futureDays);

  console.debug(`${LOG_TAG} Calendar feed request: ${startStr} to ${endStr} (buckets: ${includeBuckets})`);

  try {
    const events = mergeDays(await getCalendarEvents(startStr, endStr));

    const calendar = ical({
      name: "Preroll Plus",
      prodId: { company: "Preroll Plus", product: "Preroll Plus", language: "EN" },
    });

    events.forEach((event) => {
      // All-day dates are written from their UTC values, so build them at UTC midnight.
      // DTEND is exclusive, so it is the day after the last day.
      calendar.createEvent({
        id: `${event.id}-${event.start}@prerollplus`,
        start: new Date(event.start + "T00:00:00Z"),
        end: new Date(nextDateStr(event.end) + "T00:00:00Z"),
        allDay: true,
        summary: event.title,
        description: includeBuckets && event.buckets.length > 0 ? `Buckets: ${event.buckets.join(", ")}` : null,
      });
    });

    console.info(`${LOG_TAG} Calendar feed generated: ${events.length} events (${startStr} to ${endStr})`);

    res.type("text/calendar; charset=utf-8").send(calendar.toString());
  } catch (err) {
    console.error(`${LOG_TAG} Failed to generate calendar feed: ${err.message}`);
    res.status(500).type("text/plain").send("Failed to generate calendar feed");
  }
});

module.exports = router;
