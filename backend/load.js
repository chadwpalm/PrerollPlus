var express = require("express");
var router = express.Router();
var fs = require("fs");
var os = require("os");
var uuid = require("uuid").v4;

var appVersion, branch, UID, GID, build;

try {
  var info = fs.readFileSync("version.json");
  appVersion = JSON.parse(info).version;
  branch = JSON.parse(info).branch;
} catch (err) {
  console.error("Cannot grab version and branch info", err);
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

var fileData = `{"connected": "false","platform":"${
  os.platform
}","uuid":"${uuid()}","version":"${appVersion}","branch":"${branch}","build":"${build}","buckets":[], "sequences":[]}`;

try {
  fileData = fs.readFileSync("/config/settings.js");
  var temp = JSON.parse(fileData);

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
      branch
    );
    temp.version = appVersion;
    temp.build = build;
    temp.branch = branch;
    temp.message = true;

    delete temp["token"];
  }

  fs.writeFileSync("/config/settings.js", JSON.stringify(temp));
  fs.chownSync("/config/settings.js", UID, GID, (err) => {
    if (err) throw err;
  });
  console.info(`Config file updated to UID: ${UID} GID: ${GID}`);
  console.info("Settings file read");
} catch (err) {
  console.info("Settings file not found, creating");
  try {
    if (!fs.existsSync("/config")) {
      fs.mkdirSync("/config");
    }
    fs.writeFileSync("/config/settings.js", fileData);
    console.info("Settings file created");
    fs.chownSync("/config/settings.js", UID, GID, (err) => {
      if (err) throw err;
    });
    console.info(`Config file set to UID: ${UID} GID: ${GID}`);
  } catch (err) {
    if (err) throw err;
  }
}

router.get("/", function (req, res, next) {
  try {
    fileData = fs.readFileSync("/config/settings.js");
    console.info("Settings file read");
  } catch (err) {
    console.info("Settings file not found");
  }

  res.send(fileData);
});

module.exports = router;
