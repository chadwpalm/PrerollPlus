var express = require("express");
var router = express.Router();
var axios = require("axios").default;
const { setTimeout: setTimeoutPromise } = require("timers/promises");
var os = require("os");
var fs = require("fs");

router.post("/", async function (req, res, next) {
  var settings = req.body;
  var user;

  console.log(settings.bridge.ip);
  console.info("Hue Application Name:", `${settings.appId}`);

  var flag = false;
  var startTime = new Date().getTime();
  var url = `http://${settings.bridge.ip}/api`;
  var username;

  while (!flag && new Date().getTime() - startTime < 30000) {
    await axios
      .post(url, { devicetype: `${settings.appId}` })
      .then(function (response) {
        if (!response.data[0].error) {
          console.info(`New bridge user created - Username: ${response.data[0].success.username}`);
          username = response.data[0].success.username;
          flag = true;
        }
      })
      .catch(function (error) {
        if (error.request) {
          console.error("Could not reach bridge during detection:", error);
        }
      });
    await setTimeoutPromise(200);
  }

  if (!username) {
    console.info(`Link button not pressed. Try again...`);
  } else {
    settings.connected = "true";
  }

  if (!settings.bridge) {
    settings.bridge = {};
  }

  settings.bridge.user = username;

  var fileData = JSON.stringify(settings);

  try {
    fs.writeFileSync("/config/settings.js", fileData);
    console.info("Settings file saved");
  } catch (err) {
    if (err) throw err;
  }

  res.send(username);
});

module.exports = router;
