var axios = require("axios").default;

const LOG_TAG = "[MIGRATE]";

async function updateSequences(temp) {
  console.log(`${LOG_TAG} Starting migration to configuration schema v2`);
  if (!temp || !Array.isArray(temp.sequences)) {
    console.warn(`${LOG_TAG} No sequences found to migrate`);
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

        console.info(`${LOG_TAG} Migrated sequence "${sequence.name}" (${sequence.id}) -> holiday ${match.date}`);
      } else {
        console.info(`${LOG_TAG} No holiday match for sequence "${sequence.name}" in country ${sequence.country}`);
      }
    } catch (error) {
      console.error(
        `${LOG_TAG} Error fetching holidays for country=${sequence.country} (sequence="${sequence.name}"):`,
        error.message,
      );
    }

    if (i < temp.sequences.length - 1) {
      await delay(100);
    }
  }

  console.log(`${LOG_TAG} Migration complete`);
  return temp;
}

exports.updateSequences = updateSequences;
