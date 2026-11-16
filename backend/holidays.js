// Holiday lists from Nager.Date (source "1", Legacy) or Calendarific (source "2", Premier).
// Used by the sequence editor (backend/holiday.js) and the schedule (webhook/index.js).
//
// Each list is downloaded once per country/type/year and cached as a file in the config folder's cache/.
// Parsed lists are also kept in memory while the file is unchanged, so the Calendar page and iCal feed
// (which check every day of a month or year) don't re-read and re-parse the file each time.
// Clearing the cache (Settings > Clear Calendar Cache) deletes the files, which forces a new download.
const fs = require("fs");
const path = require("path");
const axios = require("axios").default;
const { CACHE_DIR } = require("./paths");
const log = require("./logger").tagged("HOLIDAY");

const TYPE_NAMES = { 1: "national", 2: "local", 3: "religious", 4: "observance" };

/** "1" -> "national" ... (Calendarific holiday types) */
function typeName(type) {
  return TYPE_NAMES[parseInt(type, 10)];
}

const sourceName = (source) => (source === "2" ? "Calendarific" : "Nager.Date");

function cacheFileName(country, source, type, year) {
  return source === "2" ? `${country}-calendarific-${typeName(type)}-${year}.json` : `${country}-nager-${year}.json`;
}

function apiUrl(country, source, type, year, apiKey) {
  return source === "2"
    ? `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=${country}&year=${year}&type=${typeName(type)}`
    : `https://date.nager.at/api/v3/publicholidays/${year}/${country}`;
}

/** A readable explanation of a failed holiday API request. */
function describeApiError(error, source, type) {
  if (!error.response) return null; // network error: the logger formats it
  const status = error.response.status;
  const data = error.response.data;
  const label = source === "2" && typeName(type) ? `${typeName(type)} ` : "";
  const message = `Error while trying to connect to the ${label}Holiday API. `;
  if (source === "2") {
    switch (status) {
      case 401:
        return message + "Unauthorized: Missing or incorrect API token.";
      case 422:
        switch (data?.meta?.error_code) {
          case 600:
            return message + "API is offline for maintenance.";
          case 601:
            return message + "Unauthorized: Missing or incorrect API token.";
          case 602:
            return message + "Invalid query parameters.";
          case 603:
            return message + "Subscription level required.";
          case undefined:
            return message + "Unprocessable Entity: Request was malformed.";
          default:
            return message + `Unprocessable Entity: ${data.meta.error_detail || "Unknown error"}`;
        }
      case 429:
        return message + "Too many requests: API rate limit reached.";
      case 500:
        return message + "Internal server error at Calendarific.";
      case 503:
        return message + "Service unavailable (planned outage).";
      default:
        return message + `Unexpected HTTP status: ${status}`;
    }
  }
  switch (status) {
    case 400:
      return message + "Bad request: invalid parameters.";
    case 404:
      return message + "Not found: Invalid endpoint or country code.";
    case 429:
      return message + "Too many requests: API rate limit reached.";
    case 500:
      return message + "Internal server error at Nager.Date.";
    default:
      return message + `Unexpected HTTP status: ${status}`;
  }
}

const memory = new Map(); // cache file path -> { mtimeMs, data }

/**
 * The holiday list for a country/source/type/year as returned by the API (Calendarific: { response: { holidays } },
 * Nager.Date: [ ... ]), from memory, the cache file, or a download. Returns null (and logs why) when unavailable.
 * Treat the result as read-only: it is shared between callers.
 */
async function getHolidayData({ country, source, type, year, apiKey, timeout = 10000, quiet = false }) {
  const file = path.join(CACHE_DIR, cacheFileName(country, source, type, year));

  try {
    const { mtimeMs } = fs.statSync(file);
    const cached = memory.get(file);
    if (cached && cached.mtimeMs === mtimeMs) return cached.data;
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    memory.set(file, { mtimeMs, data });
    if (!quiet) log.debug(`Holiday list from cache: ${path.basename(file)}`);
    return data;
  } catch (err) {
    if (err.code !== "ENOENT") log.warn(`Ignoring unreadable holiday cache file ${path.basename(file)}:`, err.message);
  }

  if (source === "2" && !apiKey) {
    log.error("Cannot download Calendarific holidays: no Calendarific API key in Settings");
    return null;
  }

  log.info(
    `Downloading ${year} ${country}${source === "2" ? ` ${typeName(type)}` : ""} holidays from ${sourceName(source)}`,
  );
  try {
    const response = await axios.get(apiUrl(country, source, type, year, apiKey), { timeout });
    const data = response.data;
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data), "utf8");
    memory.set(file, { mtimeMs: fs.statSync(file).mtimeMs, data });
    return data;
  } catch (error) {
    const message = describeApiError(error, source, type);
    if (message) log.error(message);
    else log.error(`Could not reach the ${sourceName(source)} holiday API:`, error);
    return null;
  }
}

module.exports = { getHolidayData, typeName };
