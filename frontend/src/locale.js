// The user's preferred locale for formatting dates. Uses the first entry of the browser's language list,
// which is also the first Accept-Language entry the backend uses for holiday dates, so both agree.
// (Passing `undefined` to Intl instead would use the browser's UI language, which in Firefox can differ.)
export const LOCALE = navigator.languages?.[0] || navigator.language || "en-US";

// True when LOCALE writes the day before the month (e.g. 14/02/2026 in en-GB, de-DE).
export const DAY_FIRST = (() => {
  try {
    const types = new Intl.DateTimeFormat(LOCALE).formatToParts(new Date(2026, 1, 14)).map((p) => p.type);
    return types.indexOf("day") < types.indexOf("month");
  } catch {
    return false;
  }
})();

// Month and day only, e.g. "02/14" (en-US) or "14/02" (en-GB)
const monthDayFormat = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "2-digit" });
export const formatMonthDay = (month, day) => monthDayFormat.format(new Date(2023, month - 1, day));

// Full date and time from a millisecond timestamp
export const formatDateTime = (timestamp) => new Date(timestamp).toLocaleString(LOCALE);
