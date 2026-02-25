var express = require("express");
var router = express.Router();
var fs = require("fs");

const LOG_TAG = "[SAVE]";

router.post("/", function (req, res, next) {
  var fileData = JSON.stringify(req.body);

  try {
    fs.writeFileSync("/config/settings.js", fileData);
    console.info(`${LOG_TAG} Settings file saved`);
  } catch (err) {
    console.error(`${LOG_TAG} Failed to create/write/own settings file: ${err.message}`);
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
