var axios = require("axios").default;
const log = require("./logger").tagged("MIGRATE");

async function updateSequences(temp) {
  log.info("Upgrading settings to the v2 format");
  if (!temp || !Array.isArray(temp.sequences)) {
    log.info("No sequences to upgrade");
    return temp;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let i = 0; i < temp.sequences.length; i++) {
    const sequence = temp.sequences[i];
    const url = `https://date.nager.at/api/v3/publicholidays/${currentYear}/${sequence.country}`;

    try {
      const response = await axios.get(url, { timeout: 10000 });

      const publicHolidays = (response.data || []).filter((h) => Array.isArray(h.types) && h.types.includes("Public"));

      const match = publicHolidays.find((h) => h.name === sequence.holiday);

      if (match) {
        sequence.states = match.counties === null ? "All" : match.counties.join(", ");
        sequence.type = sequence.type ?? "1";
        sequence.holidayDate = match.date;
        sequence.holidaySource = sequence.holidaySource ?? "1";

        log.info(`Sequence "${sequence.name}": holiday set to ${match.date}`);
      } else {
        log.debug(`Sequence "${sequence.name}": no holiday to upgrade`);
      }
    } catch (error) {
      log.error(`Could not get ${sequence.country} holidays for sequence "${sequence.name}":`, error);
    }

    if (i < temp.sequences.length - 1) {
      await delay(100);
    }
  }

  log.info("Settings upgrade complete");
  return temp;
}

exports.updateSequences = updateSequences;
