var axios = require("axios").default;

async function updateSequences(temp) {
  if (!temp || !Array.isArray(temp.sequences)) {
    console.warn("No sequences found to migrate.");
    return temp;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();

  // helper delay
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

        console.info(`Migrated sequence "${sequence.name}" (${sequence.id}) -> holiday ${match.date}`);
      } else {
        console.info(`No holiday match for sequence "${sequence.name}" in country ${sequence.country}`);
      }
    } catch (error) {
      console.error(
        `Error fetching holidays for country=${sequence.country} (sequence="${sequence.name}"):`,
        error.message
      );
    }

    // Add a 100ms delay before the next iteration to avoid hammering the API
    if (i < temp.sequences.length - 1) {
      await delay(100);
    }
  }

  return temp;
}

exports.updateSequences = updateSequences;
