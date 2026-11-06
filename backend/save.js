var express = require("express");
var router = express.Router();
const store = require("./settingsStore");
const logger = require("./logger");
const log = logger.tagged("SAVE");

router.post("/", function (req, res, next) {
  try {
    store.write(req.body);
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
