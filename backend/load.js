var express = require("express");
var router = express.Router();
var fs = require("fs");
var os = require("os");
var uuid = require("uuid").v4;
var updates = require("./migrate.js");
var axios = require("axios").default;
const { getActivePort, getBaseURL } = require("../backend/config");

const LOG_TAG = "[LOAD]";

function getInternalURL(path) {
  const base = (getBaseURL() || "").replace(/\/$/, "");
  return `http://localhost:${getActivePort()}${base}${path}`;
}

var appVersion, branch, UID, GID, build;
var platform = `${os.platform().charAt(0).toUpperCase()}${os.platform().slice(1).toLowerCase()} ${os.release}`;
var appDir = process.cwd();

try {
  var info = fs.readFileSync("version.json");
  appVersion = JSON.parse(info).version;
  branch = JSON.parse(info).branch;
} catch (err) {
  console.error(`${LOG_TAG} Cannot grab version and branch info ${err}`);
}

if (process.env.PUID) {
  UID = Number(process.env.PUID);
} else {
  UID = os.userInfo().uid;
}

if (process.env.PGID) {
  GID = Number(process.env.PGID);
} else {
  GID = os.userInfo().gid;
}

if (process.env.BUILD) {
  build = process.env.BUILD;
} else {
  build = "Native";
}

var fileData = `{"connected": "false","isLoggedIn": "false","platform":"${
  platform
}","uuid":"${uuid()}","version":"${appVersion}","branch":"${branch}","build":"${build}","appDir":"${appDir}", "sequences": [], "buckets": [],"message":true}`;

try {
  fileData = fs.readFileSync("/config/settings.js");
  var temp = JSON.parse(fileData);

  if (build !== "Native") {
    temp.settings.loc = "/prerolls";
  }

  if (!("isLoggedIn" in temp)) {
    temp.isLoggedIn = "token" in temp ? "true" : "false";
  }

  temp.appDir = appDir;

  if (temp.api !== "v2") {
    console.info(`${LOG_TAG} Backing up old settings file to "settings_v1.bak"`);
    fs.writeFileSync("/config/settings_v1.bak", JSON.stringify(temp));

    updates.updateSequences(temp).then((newTemp) => {
      newTemp.api = "v2";
      if (newTemp.version !== appVersion || newTemp.build !== build || newTemp.branch !== branch) {
        console.info(
          "Version updated from",
          newTemp.version,
          "build",
          newTemp.build,
          "branch",
          newTemp.branch,
          "to",
          appVersion,
          "build",
          build,
          "branch",
          branch,
        );
        newTemp.version = appVersion;
        newTemp.build = build;
        newTemp.branch = branch;
        newTemp.message = true;
        newTemp.platform = platform;

        newTemp.isLoggedIn = "false";
      }

      fs.writeFileSync("/config/settings.js", JSON.stringify(newTemp));
      fs.chownSync("/config/settings.js", UID, GID, (err) => {
        if (err) throw err;
      });
      console.info(`${LOG_TAG} Config file updated to UID: ${UID} GID: ${GID}`);
      console.info(`${LOG_TAG} Settings file read`);
    });
  } else {
    if (temp.version !== appVersion || temp.build !== build || temp.branch !== branch) {
      console.info(
        "Version updated from",
        temp.version,
        "build",
        temp.build,
        "branch",
        temp.branch,
        "to",
        appVersion,
        "build",
        build,
        "branch",
        branch,
      );
      temp.version = appVersion;
      temp.build = build;
      temp.branch = branch;
      temp.message = true;
      temp.platform = platform;

      temp.isLoggedIn = "false";
    }

    fs.writeFileSync("/config/settings.js", JSON.stringify(temp));
    fs.chownSync("/config/settings.js", UID, GID, (err) => {
      if (err) throw err;
    });
    console.info(`${LOG_TAG} Config file updated to UID: ${UID} GID: ${GID}`);
    console.info(`${LOG_TAG} Settings file read`);
  }

  if (temp.settings) {
    console.info(`${LOG_TAG} Creating initial sequence`);
    axios
      .get(getInternalURL("/webhook"))
      .then((response) => {
        console.info(`${LOG_TAG} Initial sequence created successfully`);
      })
      .catch((error) => {
        console.error(`${LOG_TAG} Failed to create initial sequence`, error.message);
      });
  }
} catch (err) {
  console.info(`${LOG_TAG} Settings file not found, creating... ${err}`);
  try {
    if (!fs.existsSync("/config")) {
      fs.mkdirSync("/config");
      console.info(`${LOG_TAG} Created /config directory`);
    }
    fs.writeFileSync("/config/settings.js", fileData);
    console.info(`${LOG_TAG} Settings file created/written`);
    fs.chownSync("/config/settings.js", UID, GID);

    console.info(`${LOG_TAG} Config file ownership set to UID: ${UID} GID: ${GID}`);
  } catch (err) {
    console.error(`${LOG_TAG} Failed to create/write/own settings file: ${err.message}`);
    if (err.code) {
      console.error(`${LOG_TAG} Error code: ${err.code}`);
    }
    if (err.stack) {
      console.debug(`${LOG_TAG} Stack: ${err.stack}`);
    }
  }
}

router.get("/", function (req, res, next) {
  try {
    fileData = fs.readFileSync("/config/settings.js");
    console.info(`${LOG_TAG} Settings file read`);
  } catch (err) {
    console.error(`${LOG_TAG} Settings file not found`);
  }

  res.send(fileData);
});

module.exports = router;
