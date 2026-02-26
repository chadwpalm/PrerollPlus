const fs = require("fs");
const path = require("path");

let activePort = null;
let baseURL = null;

function getActivePort() {
  if (activePort !== null) return activePort;

  if (process.env.APP_PORT) {
    const p = parseInt(process.env.APP_PORT, 10);
    if (p > 0 && p < 65536) {
      activePort = p;
      console.info(`[CONFIG] Using port from APP_PORT env: ${p}`);
      return p;
    }
  }

  try {
    const settingsPath = path.join("/", "config", "settings.js");
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
      const cfgPort = settings?.settings?.appPort;
      if (cfgPort && !isNaN(cfgPort) && cfgPort > 0 && cfgPort < 65536) {
        activePort = cfgPort;
        console.info(`[CONFIG] Using port from settings.js: ${cfgPort}`);
        return cfgPort;
      }
    }
  } catch (err) {
    console.error("[CONFIG] Error reading settings.js for port:", err.message);
  }

  activePort = 4949;
  console.info("[CONFIG] Using default port: 4949");
  return 4949;
}

function getBaseURL() {
  if (baseURL !== null) return baseURL;

  try {
    const settingsPath = path.join("/", "config", "settings.js");
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
      const cfgURL = settings?.settings?.baseURL;

      baseURL = (typeof cfgURL === "string" ? cfgURL : "").replace(/\/$/, "");

      console.info(`[CONFIG] Base URL loaded: "${baseURL}"`);
      return baseURL;
    }
  } catch (err) {
    console.error("[CONFIG] Error reading settings.js for port:", err.message);
  }

  activePort = 4949;
  console.info("[CONFIG] Using default port: 4949");
  return 4949;
}

module.exports = { getActivePort, getBaseURL };
