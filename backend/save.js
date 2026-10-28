var express = require("express");
var router = express.Router();
var fs = require("fs");

const LOG_TAG = "[SAVE]";

// We'll import the schedule function from the webhook file
// (We'll handle the import cleanly below)

router.post("/", function (req, res, next) {
  var fileData = JSON.stringify(req.body);

  try {
    fs.writeFileSync("/config/settings.js", fileData);
    console.debug(`${LOG_TAG} Settings file saved successfully`);

    // === IMPORTANT: Reschedule override timer after every save ===
    // This catches when user creates, modifies, or clears an override
    if (global.scheduleOverrideExpiration) {
      global.scheduleOverrideExpiration();
    }
  } catch (err) {
    console.error(`${LOG_TAG} Failed to create/write settings file: ${err.message}`);
    if (err.code) {
      console.error(`${LOG_TAG} Error code: ${err.code}`);
    }
    if (err.stack) {
      console.debug(`${LOG_TAG} Stack: ${err.stack}`);
    }
  }

  res.send();
});

module.exports = router;
