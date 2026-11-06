// Holiday list for the sequence editor's Holiday dropdown.
var express = require("express");
var router = express.Router();
var fs = require("fs");
const { CACHE_DIR } = require("./paths");
const { getHolidayData } = require("./holidays");
const log = require("./logger").tagged("HOLIDAY");

if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    log.info(`Created holiday cache folder ${CACHE_DIR}`);
  } catch (err) {
    log.error(`Could not create holiday cache folder ${CACHE_DIR}. Check file system permissions.`, err);
  }
}

// "2026-12-25" or "2026-12-25T10:00:00-05:00" -> local date text, e.g. "12/25/2026" for en-US
function formatHolidayDate(dateString, locale) {
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    log.warn(`Unrecognized holiday date format: ${dateString}`);
    return dateString;
  }
  const [, year, month, day] = match;
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function dedupeHolidays(holidays) {
  const seen = new Set();
  return holidays.filter((holiday) => {
    const key = `${holiday.name}||${holiday.date}||${holiday.states}`;
    if (seen.has(key)) {
      log.debug(`Skipped duplicate holiday: ${key}`);
      return false;
    }
    seen.add(key);
    return true;
  });
}

router.post("/", async function (req, res, next) {
  const { country, source, type, apiKey } = req.body;
  const year = new Date().getFullYear();
  const userLocale = req.headers["accept-language"]?.split(",")[0] || "en-US"; // So dates are formatted based on location

  if (source === "2" && !apiKey) {
    return res.status(400).json({ success: false, message: "Calendarific API key is not set.", apiKeyMissing: true });
  }

  const data = await getHolidayData({ country, source, type, year, apiKey });

  let holidays = [];
  if (source === "2") {
    if (Array.isArray(data?.response?.holidays)) {
      holidays = data.response.holidays.map((holiday) => ({
        name: holiday.name,
        date: formatHolidayDate(holiday.date.iso, userLocale),
        rawDate: holiday.date.iso,
        states: holiday.locations,
      }));
    } else if (data) {
      log.error("The Calendarific holiday API did not return a holiday list");
    }
  } else if (source === "1") {
    if (Array.isArray(data)) {
      holidays = data
        .filter((holiday) => holiday.types.includes("Public"))
        .map((holiday) => ({
          name: holiday.name,
          date: formatHolidayDate(holiday.date, userLocale),
          rawDate: holiday.date,
          states: holiday.counties === null ? "All" : holiday.counties.join(", "),
        }));
    } else if (data) {
      log.error("The Nager.Date holiday API did not return a holiday list");
    }
  }

  holidays = dedupeHolidays(holidays);
  log.debug(`Sent ${holidays.length} holidays for ${country}`);
  res.json(holidays);
});

module.exports = router;
