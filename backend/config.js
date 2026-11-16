const fs = require("fs");
const { CONFIG_DIR, SETTINGS_FILE } = require("./paths");

const LOG_TAG = "[CONFIG]";
const SETTINGS_PATH = SETTINGS_FILE;
const DEFAULT_PORT = 4949;

let activePort = null;
let baseURL = null;
let portSource = null; // "APP_PORT" | "PORT" | "settings" | "default"
let baseURLSource = null; // "APP_BASE_URL" | "settings" | "default"

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"))?.settings || {};
    }
  } catch (err) {
    console.error(`${LOG_TAG} Error reading settings.js:`, err.message);
  }
  return {};
}

function parsePort(value) {
  const p = parseInt(value, 10);
  return Number.isInteger(p) && p > 0 && p < 65536 ? p : null;
}

// "prerollplus", "/prerollplus/", " /a/b " -> "/prerollplus", "/a/b". Empty -> "" (root).
// Only URL-safe path characters are allowed since the value is written into index.html.
function normalizeBaseURL(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed) return "";
  if (!/^[A-Za-z0-9._~\-/]+$/.test(trimmed) || trimmed.split("/").some((s) => s === "" || s === "." || s === "..")) {
    console.error(`${LOG_TAG} Ignoring invalid base URL "${value}", running at root`);
    return "";
  }
  return "/" + trimmed;
}

/**
 * Port the server listens on (resolved once per process; changes need a restart).
 * Priority: APP_PORT env, PORT env, settings.appPort, 4949.
 */
function getActivePort() {
  if (activePort !== null) return activePort;

  for (const name of ["APP_PORT", "PORT"]) {
    if (process.env[name]) {
      const p = parsePort(process.env[name]);
      if (p) {
        console.info(`${LOG_TAG} Using port ${p} from ${name} environment variable`);
        portSource = name;
        return (activePort = p);
      }
      console.error(`${LOG_TAG} Ignoring invalid ${name} "${process.env[name]}"`);
    }
  }

  const cfgPort = parsePort(readSettings().appPort);
  if (cfgPort) {
    console.info(`${LOG_TAG} Using port ${cfgPort} from settings`);
    portSource = "settings";
    return (activePort = cfgPort);
  }

  console.info(`${LOG_TAG} Using default port ${DEFAULT_PORT}`);
  portSource = "default";
  return (activePort = DEFAULT_PORT);
}

/**
 * URL base for reverse proxies, e.g. "/prerollplus", or "" for root
 * (resolved once per process; changes need a restart).
 * Priority: APP_BASE_URL env, settings.baseURL, root.
 */
function getBaseURL() {
  if (baseURL !== null) return baseURL;

  if (process.env.APP_BASE_URL) {
    baseURL = normalizeBaseURL(process.env.APP_BASE_URL);
    if (baseURL) console.info(`${LOG_TAG} Using base URL "${baseURL}" from APP_BASE_URL environment variable`);
    baseURLSource = "APP_BASE_URL";
    return baseURL;
  }

  baseURL = normalizeBaseURL(readSettings().baseURL);
  baseURLSource = baseURL ? "settings" : "default";
  console.info(
    baseURL ? `${LOG_TAG} Using base URL "${baseURL}" from settings` : `${LOG_TAG} No base URL, running at root`,
  );
  return baseURL;
}

/** URL for the server to call its own routes, e.g. getInternalURL("/backend/discover"). */
function getInternalURL(path) {
  return `http://localhost:${getActivePort()}${getBaseURL()}${path}`;
}

/** What the server is running with right now, and where each value came from (for the Settings page). */
function getHostInfo() {
  return {
    port: getActivePort(),
    portSource,
    defaultPort: DEFAULT_PORT,
    baseURL: getBaseURL(),
    baseURLSource,
    configDir: CONFIG_DIR,
    appDir: require("path").resolve(__dirname, ".."),
  };
}

module.exports = { getActivePort, getBaseURL, getInternalURL, normalizeBaseURL, getHostInfo };
