// Central logging for the backend.
//
//   const log = require("./logger").tagged("MONITOR");
//   log.info("Watching", dir);   ->  [2026-11-05 10:00:00] [INFO ] [MONITOR] Watching /prerolls
//
// - Level, file size and file count come from settings (Settings > Logging) and are re-applied on save.
// - Errors are formatted usefully: HTTP (axios) errors become one line, other errors keep their stack.
// - Secrets (Plex token, email, API keys) are masked in everything written.
// - Plain console.* calls are routed through here too (untagged).
const fs = require("fs");
const util = require("util");
const { createLogger, format, transports } = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const { SETTINGS_FILE, LOG_DIR } = require("./paths");

const DEFAULTS = { logLevel: "0", logSize: "1", logFiles: "5" }; // 0 = info, 1 = debug

// Keep the original console for last-resort output (e.g. when the logger itself fails)
const rawConsole = { log: console.log, error: console.error };

let current = { ...DEFAULTS };
let secrets = []; // exact secret values from settings, longest first

// ---------- redaction ----------

const SECRET_PATTERNS = [
  [/(X-Plex-Token[=:"' ]+)[A-Za-z0-9_\-.~]+/gi, "$1***"],
  [/([?&](?:api_key|apikey)=)[^&\s"']+/gi, "$1***"],
  // JSON ("token":"x") and util.inspect (token: 'x') styles
  [/(["']?\b(?:token|authToken|accessToken|apiKey|mainApiKey|password)["']?\s*:\s*["'])[^"']+(["'])/gi, "$1***$2"],
];

function loadSecrets(settings) {
  const values = [
    settings?.token,
    settings?.email,
    settings?.mainApiKey,
    settings?.settings?.apiKey,
    settings?.sessionSecret,
  ];
  secrets = values.filter((v) => typeof v === "string" && v.length >= 6).sort((a, b) => b.length - a.length);
}

function redact(text) {
  let out = text;
  for (const s of secrets) out = out.split(s).join("***");
  for (const [re, rep] of SECRET_PATTERNS) out = out.replace(re, rep);
  return out;
}

// ---------- message formatting ----------

/** One-line summary of an axios error: status/code, method, URL (no query), and the server's error text. */
function formatHttpError(err) {
  const method = (err.config?.method || "").toUpperCase();
  let url = err.config?.url || "";
  try {
    const u = new URL(url);
    url = `${u.origin}${u.pathname}`; // drop query string (tokens and API keys live there)
  } catch {
    /* relative or missing URL */
  }
  const status = err.response
    ? `HTTP ${err.response.status}${err.response.statusText ? " " + err.response.statusText : ""}`
    : err.code || "No response";
  const data = err.response?.data;
  const details = [];
  // Calendarific: { meta: { error_detail } }   Plex/other: string or { error }
  if (data?.meta?.error_detail) details.push(data.meta.error_detail);
  if (typeof data === "string" && data.length < 300) details.push(data.trim());
  if (!details.length && data?.error)
    details.push(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
  if (!details.length && !err.response && err.message) details.push(err.message);
  return [status, method && url ? `${method} ${url}` : url, details.join("; ")].filter(Boolean).join(" - ");
}

function formatArg(arg) {
  if (arg instanceof Error || arg?.isAxiosError) {
    if (arg.isAxiosError) return formatHttpError(arg);
    return arg.stack || `${arg.name}: ${arg.message}`;
  }
  if (typeof arg === "string") return arg;
  return util.inspect(arg, { depth: 4, breakLength: Infinity, colors: false });
}

function formatMessage(args) {
  return redact(args.map(formatArg).join(" "));
}

// ---------- winston ----------

const lineFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf(({ timestamp, level, message, tag }) => {
    return `[${timestamp}] [${level.toUpperCase().padEnd(5)}]${tag ? ` [${tag}]` : ""} ${message}`;
  }),
);

let fileTransport = null;

function makeFileTransport({ logSize, logFiles }) {
  const t = new DailyRotateFile({
    filename: `${LOG_DIR}/prerollplus-%DATE%.log`,
    datePattern: "YYYY-MM-DD",
    maxSize: `${logSize}m`,
    maxFiles: `${logFiles}`,
  });
  t.on("error", (err) => rawConsole.error("[LOGGER] Log file error:", err.message));
  return t;
}

const winstonLogger = createLogger({
  level: "info",
  format: lineFormat,
  transports: [new transports.Console()],
});

function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/** (Re)read level/size/files and secrets from settings.js. Called at startup and after every settings save. */
function reload() {
  let settings = null;
  try {
    if (fs.existsSync(SETTINGS_FILE)) settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
  } catch (err) {
    rawConsole.error("[LOGGER] Could not read settings.js:", err.message);
  }
  loadSecrets(settings);

  const s = settings?.settings || {};
  const next = {
    logLevel: s.logLevel === "1" ? "1" : "0",
    logSize: String(clampInt(s.logSize, 1, 100, Number(DEFAULTS.logSize))),
    logFiles: String(clampInt(s.logFiles, 1, 60, Number(DEFAULTS.logFiles))),
  };

  const level = next.logLevel === "1" ? "debug" : "info";
  const levelChanged = winstonLogger.level !== level;
  winstonLogger.level = level;

  // Replace (not add) the file transport, so saving settings never leaves old log files open
  const fileChanged = !fileTransport || next.logSize !== current.logSize || next.logFiles !== current.logFiles;
  if (fileChanged) {
    if (fileTransport) {
      winstonLogger.remove(fileTransport);
      fileTransport.close?.();
    }
    fileTransport = makeFileTransport(next);
    winstonLogger.add(fileTransport);
  }

  const first = current.applied === undefined;
  current = { ...next, applied: true };
  if (first || levelChanged || fileChanged) {
    write("info", "LOGGER", [
      `Log level "${level}", max file size ${next.logSize} MB, keeping ${next.logFiles} file(s)`,
    ]);
  }
}

function write(level, tag, args) {
  try {
    winstonLogger.log({ level, tag, message: formatMessage(args) });
  } catch (err) {
    rawConsole.error("[LOGGER] Failed to write log:", err);
  }
}

/** A logger whose lines are prefixed with [TAG]. */
function tagged(tag) {
  return {
    debug: (...args) => write("debug", tag, args),
    info: (...args) => write("info", tag, args),
    warn: (...args) => write("warn", tag, args),
    error: (...args) => write("error", tag, args),
    /** True when debug lines will be written (to skip building expensive debug messages). */
    isDebug: () => winstonLogger.level === "debug",
  };
}

// Route stray console.* calls through the logger (untagged)
console.log = (...args) => write("info", null, args);
console.info = (...args) => write("info", null, args);
console.warn = (...args) => write("warn", null, args);
console.error = (...args) => write("error", null, args);
console.debug = (...args) => write("debug", null, args);

// Never die silently
const procLog = tagged("PROCESS");
process.on("uncaughtException", (err) => {
  procLog.error("Uncaught exception, shutting down:", err);
  // give the file transport a moment to flush
  setTimeout(() => process.exit(1), 500);
});
process.on("unhandledRejection", (reason) => {
  procLog.error("Unhandled promise rejection:", reason);
});

reload();

module.exports = { tagged, reload, redact, formatHttpError };
