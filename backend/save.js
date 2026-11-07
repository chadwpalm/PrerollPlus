var express = require("express");
var router = express.Router();
const store = require("./settingsStore");
const logger = require("./logger");
const { SERVER_ONLY } = require("./load");
const log = logger.tagged("SAVE");

// Set by the server, never by the page: the sign-in (backend/auth.js) and the Plex account shown in the menu
const KEPT_FROM_SERVER = [...SERVER_ONLY, "username", "email", "thumb", "uuid"];

router.post("/", function (req, res, next) {
  const incoming = req.body;
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return res.status(400).json({ error: "Settings must be a JSON object" });
  }

  try {
    store.update((current) => {
      const saved = { ...incoming };
      for (const key of KEPT_FROM_SERVER) {
        if (key in current) saved[key] = current[key];
        else delete saved[key];
      }
      delete saved.isLoggedIn; // replaced by per-browser sessions in 1.6.0
      // In Docker the media folder is always mounted at /prerolls
      if (process.env.BUILD && process.env.BUILD !== "Native" && saved.settings) {
        saved.settings = { ...saved.settings, loc: "/prerolls" };
      }
      // store.update() writes back the object it was given, so replace its contents
      for (const key of Object.keys(current)) delete current[key];
      Object.assign(current, saved);
    });
    log.debug("Settings file saved");
  } catch (err) {
    log.error("Could not save settings file:", err);
    return next(err);
  }

  // Apply log level/size/files and refresh the secrets used for redaction
  logger.reload();

  // Reschedule the override expiry timer, since this save may have created, changed or cleared an override
  require("../webhook/index").scheduleOverrideExpiration();

  res.send();
});

module.exports = router;
