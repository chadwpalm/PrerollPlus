var express = require("express");
var router = express.Router();
var fs = require("fs");
var path = require("path");
var axios = require("axios").default;

const cacheDir = path.join("/", "config", "cache");

// Make sure the directory exists
if (!fs.existsSync(cacheDir)) {
  console.info("Cache directory doesn't exist....creating....");
  fs.mkdirSync(cacheDir, { recursive: true });
}

router.post("/", async function (req, res, next) {
  const HolidayType = {
    1: "national",
    2: "local",
    3: "religious",
    4: "observance",
  };

  const typeName = HolidayType[parseInt(req.body.type, 10)];

  console.debug(
    `Country: ${req.body.country}, Source: ${req.body.source === "1" ? "Legacy" : "Premier"}, Type: ${typeName}`
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  const userLocale = req.headers["accept-language"]?.split(",")[0] || "en-US"; // So dates are formatted based on location

  // Helper function to safely parse and format dates
  function formatHolidayDate(dateString, locale) {
    let year, month, day;

    // If it's just YYYY-MM-DD
    const simpleDateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (simpleDateMatch) {
      [, year, month, day] = simpleDateMatch;
      return new Date(year, month - 1, day).toLocaleDateString(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    }

    // If it's a full ISO string with time or timezone, extract YYYY-MM-DD only
    const isoDateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDateMatch) {
      [, year, month, day] = isoDateMatch;
      return new Date(year, month - 1, day).toLocaleDateString(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    }

    console.warn(`Unrecognized date format: ${dateString}`);
    return dateString; // fallback
  }

  const source = req.body.source;
  let rawData;

  let cacheFile;
  if (source === "2") {
    cacheFile = path.join(cacheDir, `${req.body.country}-calendarific-${typeName}-${currentYear}.json`);
  }

  if (source === "2" && fs.existsSync(cacheFile)) {
    console.log(`Reading Calendarific holidays from cache: ${cacheFile}`);
    rawData = fs.readFileSync(cacheFile, "utf-8");
  } else {
    const url =
      source === "1"
        ? `https://date.nager.at/api/v3/publicholidays/${currentYear}/${req.body.country}`
        : `https://calendarific.com/api/v2/holidays?api_key=${req.body.apiKey}&country=${req.body.country}&year=${currentYear}&type=${typeName}`;

    if (source === "2" && !req.body.apiKey) {
      return res.status(400).send(
        JSON.stringify({
          success: false,
          message: "Calendarific API key is not set.",
          apiKeyMissing: true, // frontend can use this flag to show a notice
        })
      );
    }

    try {
      const response = await axios.get(url, { timeout: 10000 });
      rawData = JSON.stringify(response.data);

      // Only cache Calendarific data
      if (source === "2") {
        fs.writeFileSync(cacheFile, rawData, "utf-8");
      }
    } catch (error) {
      let source = req.body.source;
      let type = HolidayType[parseInt(req.body.type, 10)];

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        let message = `Error while trying to connect to the ${type} Holiday API. `;

        if (source === "2") {
          // 📌 Calendarific API
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
          // 📌 date.nager.at API (they only use standard HTTP statuses)
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
    }
  }

  let countries = [];
  if (source === "2") {
    try {
      const parsed = JSON.parse(rawData);
      parsed.response.holidays.forEach((country) => {
        countries.push({
          name: country.name,
          date: formatHolidayDate(country.date.iso, userLocale),
          rawDate: country.date.iso,
          states: country.locations,
        });
      });
    } catch {
      console.error("There was not valid data returned from the Holiday API");
    }
  } else if (source === "1") {
    try {
      const parsed = JSON.parse(rawData);
      parsed
        .filter((holiday) => holiday.types.includes("Public"))
        .forEach((country) => {
          countries.push({
            name: country.name,
            date: formatHolidayDate(country.date, userLocale),
            rawDate: country.date,
            states: country.counties === null ? "All" : country.counties.join(", "),
          });
        });
    } catch {
      console.error("There was not valid data returned from the Holiday API");
    }
  }

  function dedupeHolidays(holidays) {
    const seen = new Set();
    return holidays.filter((holiday) => {
      const key = `${holiday.name}||${holiday.date}||${holiday.states}`;
      if (seen.has(key)) {
        console.log(`Duplicate removed: ${key}`); // optional logging
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  res.send(JSON.stringify(dedupeHolidays(countries)));
});

module.exports = router;
