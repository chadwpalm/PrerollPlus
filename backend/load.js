var express = require("express");
var router = express.Router();
var fs = require("fs");
var os = require("os");
var crypto = require("crypto");
var uuid = crypto.randomUUID;
var updates = require("./migrate.js");
const { CONFIG_DIR, SETTINGS_FILE, configPath } = require("./paths");
const log = require("./logger").tagged("SETTINGS");

var appVersion, branch, UID, GID, build;
var platform = `${os.platform().charAt(0).toUpperCase()}${os.platform().slice(1).toLowerCase()} ${os.release}`;
var appDir = process.cwd();
const mainApiKey = uuid().replace(/-/g, "");
// Signs the session cookies (backend/auth.js)
const newSecret = () => crypto.randomBytes(32).toString("hex");

try {
  var info = fs.readFileSync("version.json");
  appVersion = JSON.parse(info).version;
  branch = JSON.parse(info).branch;
} catch (err) {
  log.error("Cannot read version and branch from version.json:", err);
}

UID = process.env.PUID ? Number(process.env.PUID) : os.userInfo().uid;
GID = process.env.PGID ? Number(process.env.PGID) : os.userInfo().gid;
build = process.env.BUILD || "Native";

var fileData = `{"connected": "false","platform":"${
  platform
}","uuid":"${uuid()}","version":"${appVersion}","branch":"${branch}","build":"${build}","appDir":"${appDir}","mainApiKey":"${mainApiKey}","sessionSecret":"${newSecret()}","sequences": [], "buckets": [],"message":true}`;

// After an update (new version, build or branch): record it and show the announcement
function applyVersionChange(temp) {
  if (temp.version === appVersion && temp.build === build && temp.branch === branch) return;
  log.info(
    `Updated from ${temp.version} (build ${temp.build}, ${temp.branch} branch) to ${appVersion} (build ${build}, ${branch} branch)`,
  );
  temp.version = appVersion;
  temp.build = build;
  temp.branch = branch;
  temp.message = true;
  temp.platform = platform;
}

// Push today's sequence to Plex now that the server is starting (loaded here to keep startup order simple)
// (Errors are caught here so they can never reach the "settings file missing" handler below.)
function startupUpdate() {
  try {
    require("../webhook/index")
      .updatePrerolls()
      .then(() => log.debug("Startup sequence update done"))
      .catch((error) => log.error("Startup sequence update failed:", error));
  } catch (error) {
    log.error("Startup sequence update failed:", error);
  }
}

function writeSettings(temp) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(temp));
  fs.chownSync(SETTINGS_FILE, UID, GID);
  log.debug(`Settings file written, owner UID ${UID} GID ${GID}`);
}

try {
  fileData = fs.readFileSync(SETTINGS_FILE);
  var temp = JSON.parse(fileData);

  if (!temp.mainApiKey) {
    temp.mainApiKey = mainApiKey;
  }

  // In Docker the media folder is always mounted at /prerolls
  if (build !== "Native" && temp.settings) {
    temp.settings.loc = "/prerolls";
  }

  // Before 1.6.0 the signed-in state was one shared flag; sign-in is now checked per browser (backend/auth.js)
  delete temp.isLoggedIn;
  if (!temp.sessionSecret) temp.sessionSecret = newSecret();

  temp.appDir = appDir;

  if (temp.api !== "v2") {
    log.info('Backing up old settings file to "settings_v1.bak"');
    fs.writeFileSync(configPath("settings_v1.bak"), JSON.stringify(temp));

    updates.updateSequences(temp).then((newTemp) => {
      newTemp.api = "v2";
      applyVersionChange(newTemp);
      writeSettings(newTemp);
      require("./auth").resolveOwnerFromToken();
      if (newTemp.settings) startupUpdate();
    });
  } else {
    applyVersionChange(temp);
    writeSettings(temp);
    require("./auth").resolveOwnerFromToken();
    if (temp.settings) startupUpdate();
  }
} catch (err) {
  if (err.code !== "ENOENT") log.error("Could not read settings file, creating a new one:", err);
  else log.info(`No settings file in ${CONFIG_DIR}, creating one`);
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, fileData);
    fs.chownSync(SETTINGS_FILE, UID, GID);
    log.info(`Settings file created, owner UID ${UID} GID ${GID}`);
  } catch (err) {
    log.error("Could not create the settings file:", err);
  }
}

// Settings that stay on the server: the browser never needs them, and backend/save keeps them as they are
const SERVER_ONLY = ["token", "sessionSecret", "ownerId", "plexSignInNeeded"];

router.get("/", function (req, res, next) {
  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
  } catch (err) {
    log.error("Could not read settings file:", err);
    return next(err);
  }
  for (const key of SERVER_ONLY) delete settings[key];
  res.json(settings);
});

module.exports = router;
module.exports.SERVER_ONLY = SERVER_ONLY;
