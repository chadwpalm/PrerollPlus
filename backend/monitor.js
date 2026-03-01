var express = require("express");
var router = express.Router();
var fs = require("fs");
var path = require("path");
var chokidar = require("chokidar");
var axios = require("axios");
const { broadcastUpdate } = require("./websocket");
const { getActivePort, getBaseURL } = require("../backend/config");

const LOG_TAG = "[MONITOR]";

function getInternalURL(path) {
  const base = (getBaseURL() || "").replace(/\/$/, "");
  return `http://localhost:${getActivePort()}${base}${path}`;
}

let pendingAdds = new Map(); // Store added files with relevant information
let pendingRemovals = new Map(); // Track removed files
let renameDelay; // Delay for rename detection
let pathToWatch = "";
let isRemoved = true;
let isAdded = true;
let watcher = null;
let isInit = true;
let initTime = 2000;

function initializeWatcher() {
  if (watcher) {
    console.info(`${LOG_TAG} Closing existing watcher before reinitializing...`);
    watcher.close();
    watcher = null;
    isInit = true;
  }

  try {
    settings = JSON.parse(fs.readFileSync("/config/settings.js"));

    if (settings.settings) {
      pathToWatch = settings.settings.loc;
      renameDelay = settings.settings.polling === "1" ? 500 : 1000;
    }
  } catch (err) {
    console.error(`${LOG_TAG} Cannot grab dir location ${err}`);
    return;
  }

  if (fs.existsSync(pathToWatch)) {
    watcher = chokidar.watch(pathToWatch, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      usePolling: settings.settings.polling === "2",
      interval: 100,
    });

    console.debug(
      `${LOG_TAG} Watcher started - path: ${pathToWatch}, polling: ${settings.settings.polling === "2" ? "yes" : "no"}, interval: 100ms`,
    );

    watcher.on("addDir", (filePath) => {
      if (!isInit) {
        console.debug(`${LOG_TAG} Directory ${filePath} has been added`);
        broadcastUpdate();
      }
    });

    watcher.on("unlinkDir", (filePath) => {
      if (!isInit) {
        console.debug(`${LOG_TAG} Directory ${filePath} has been removed`);
        broadcastUpdate();
      }
    });

    watcher.on("add", (filePath) => {
      filePath = filePath
        .replace(/@SynoEAStream/i, "") // Fix for Synology issue
        .replace(/@SynoResource/i, "")
        .replace(/@eaDir\//i, "");
      const baseName = path.basename(filePath);
      const dirName = path.dirname(filePath);

      pendingAdds.set(filePath, { baseName, dirName });

      for (const [removedPath, removedFile] of pendingRemovals) {
        if (removedFile.dirName === dirName && removedFile.baseName !== baseName) {
          console.info(`${LOG_TAG} File ${removedPath} was renamed to ${filePath}`);

          handleRenameOrMove(removedPath, filePath);

          pendingAdds.delete(filePath);
          isRemoved = false;
          return;
        }
        if (removedFile.baseName === baseName && removedFile.dirName !== dirName) {
          console.info(`${LOG_TAG} File ${removedPath} was moved to ${filePath}`);

          handleRenameOrMove(removedPath, filePath);

          pendingAdds.delete(filePath);
          isRemoved = false;
          return;
        }
      }

      if (!isInit) {
        console.debug(`${LOG_TAG} Queued potential add: ${filePath} (pendingAdds size: ${pendingAdds.size})`);
      }

      setTimeout(() => {
        if (!isInit && isAdded) {
          console.debug(`${LOG_TAG} File ${filePath} has been added`);
          broadcastUpdate();
        }
        if (pendingAdds.has(filePath)) {
          pendingAdds.delete(filePath);
          isAdded = true;
        }
      }, renameDelay);
    });

    watcher.on("unlink", (filePath) => {
      filePath = filePath
        .replace(/@SynoEAStream/i, "") // Fix for Synology issue
        .replace(/@SynoResource/i, "")
        .replace(/@eaDir\//i, "");
      const baseName = path.basename(filePath);
      const dirName = path.dirname(filePath);

      pendingRemovals.set(filePath, { baseName, dirName });
      console.debug(`${LOG_TAG} Queued potential removal: ${filePath} (pendingRemovals size: ${pendingRemovals.size})`);

      for (const [addedPath, addedFile] of pendingAdds) {
        if (addedFile.dirName === dirName && addedFile.baseName !== baseName) {
          console.info(`${LOG_TAG} File ${filePath} was renamed to ${addedPath}`);

          handleRenameOrMove(filePath, addedPath);

          pendingRemovals.delete(filePath);
          isAdded = false;
          return;
        }

        if (addedFile.baseName === baseName && addedFile.dirName !== dirName) {
          console.info(`${LOG_TAG} File ${filePath} was moved to ${addedPath}`);
          handleRenameOrMove(filePath, addedPath);

          pendingRemovals.delete(filePath);
          isAdded = false;
          return;
        }
      }

      setTimeout(() => {
        if (isRemoved) {
          console.debug(`${LOG_TAG} File ${filePath} has been removed`);
          handleRemove(filePath);
        } else {
          console.debug(`${LOG_TAG} Removal was part of rename/move - ignored standalone remove`);
        }
        pendingRemovals.delete(filePath);
        isRemoved = true;
      }, renameDelay);
    });

    // Handle errors
    watcher.on("error", (error) => console.error(`Watcher error: ${error}`));
  } else {
    console.warn(`${LOG_TAG} Watcher not started. Directory ${pathToWatch} not found`);
    return;
  }

  setTimeout(() => {
    isInit = false;
    console.debug(`${LOG_TAG} Ready to start monitoring directories`);
  }, initTime);
}

function handleRenameOrMove(oldPath, newPath) {
  settings = JSON.parse(fs.readFileSync("/config/settings.js"));
  console.info(`${LOG_TAG} Handling rename from ${oldPath} to ${newPath} in buckets`);
  let settingsUpdated = false;
  settings.buckets.forEach((bucket) => {
    bucket.media.forEach((file) => {
      if (
        file.file === path.basename(oldPath) &&
        file.dir === path.dirname(oldPath).replace(settings.settings.loc, "")
      ) {
        file.file = path.basename(newPath);
        file.dir = path.dirname(newPath).replace(settings.settings.loc, "");
        console.info(
          `${LOG_TAG} Updated settings for renamed file: ${oldPath} to ${newPath} in bucket "${bucket.name}"`,
        );
        settingsUpdated = true;
      }
    });
  });
  if (settingsUpdated) {
    try {
      fs.writeFileSync("/config/settings.js", JSON.stringify(settings));
      console.info(`${LOG_TAG} Settings file saved`);

      axios
        .get(getInternalURL("/webhook"))
        .then((response) => {})
        .catch((error) => {});
    } catch (err) {
      console.error(`${LOG_TAG} Error saving settings file ${err}`);
    }
  }
  broadcastUpdate();
}

function handleRemove(oldPath) {
  settings = JSON.parse(fs.readFileSync("/config/settings.js"));
  console.info(`${LOG_TAG} Handling removal of ${oldPath} in buckets...`);

  let settingsUpdated = false;

  settings.buckets.forEach((bucket) => {
    const initialMediaLength = bucket.media.length;

    bucket.media = bucket.media.filter(
      (file) =>
        !(
          file.file === path.basename(oldPath) && file.dir === path.dirname(oldPath).replace(settings.settings.loc, "")
        ),
    );

    if (bucket.media.length !== initialMediaLength) {
      console.info(`${LOG_TAG} Removed all occurrences of ${oldPath} from bucket "${bucket.name}"`);
      settingsUpdated = true;
    }
  });

  if (settingsUpdated) {
    try {
      fs.writeFileSync("/config/settings.js", JSON.stringify(settings));
      console.info(`${LOG_TAG} Settings file saved`);
      axios
        .get(getInternalURL("/webhook"))
        .then((response) => {})
        .catch((error) => {});
    } catch (err) {
      console.error(`${LOG_TAG} Error saving settings file ${err}`);
    }
  } else {
    console.info(`${LOG_TAG} No changes made to settings`);
  }
  broadcastUpdate();
}

initializeWatcher();

router.get("/", function (req, res, next) {
  initializeWatcher();
  res.status(200).send();
});

module.exports = router;
