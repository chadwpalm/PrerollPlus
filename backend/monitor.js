var express = require("express");
var router = express.Router();
var fs = require("fs");
var path = require("path");
var chokidar = require("chokidar");
const { broadcastUpdate } = require("./websocket");
const store = require("./settingsStore");
const log = require("./logger").tagged("MONITOR");

// Rebuild today's preroll list after bucket contents changed (loaded here to avoid a circular require)
function refreshPrerolls() {
  require("../webhook/index")
    .updatePrerolls()
    .catch((error) => log.error("Preroll refresh after file change failed:", error));
}

let pendingAdds = new Map();
let pendingRemovals = new Map();
let renameDelay;
let pathToWatch = "";
let isRemoved = true;
let isAdded = true;
let watcher = null;
let isInit = true;
let initTime = 2000;
let settings;

function initializeWatcher() {
  if (watcher) {
    log.debug("Restarting file watcher");
    watcher.close();
    watcher = null;
    isInit = true;
  }

  try {
    settings = store.read();

    if (settings.settings) {
      pathToWatch = settings.settings.loc;
      renameDelay = settings.settings.polling === "1" ? 500 : 1000;
    }
  } catch (err) {
    log.error("Cannot read the preroll folder location from settings:", err);
    return;
  }

  if (fs.existsSync(pathToWatch)) {
    watcher = chokidar.watch(pathToWatch, {
      ignored: /(^|[/\\])\../,
      persistent: true,
      usePolling: settings.settings.polling === "2",
      interval: 100,
    });

    log.info(`Watching ${pathToWatch} for file changes${settings.settings.polling === "2" ? " (polling)" : ""}`);

    watcher.on("addDir", (filePath) => {
      if (!isInit) {
        log.debug(`Folder added: ${filePath}`);
        broadcastUpdate();
      }
    });

    watcher.on("unlinkDir", (filePath) => {
      if (!isInit) {
        log.debug(`Folder removed: ${filePath}`);
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
          log.info(`File renamed: ${removedPath} -> ${filePath}`);

          handleRenameOrMove(removedPath, filePath);

          pendingAdds.delete(filePath);
          isRemoved = false;
          return;
        }
        if (removedFile.baseName === baseName && removedFile.dirName !== dirName) {
          log.info(`File moved: ${removedPath} -> ${filePath}`);

          handleRenameOrMove(removedPath, filePath);

          pendingAdds.delete(filePath);
          isRemoved = false;
          return;
        }
      }

      if (!isInit) {
        log.debug(`Queued possible add: ${filePath} (${pendingAdds.size} pending)`);
      }

      setTimeout(() => {
        if (!isInit && isAdded) {
          log.info(`File added: ${filePath}`);
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
      log.debug(`Queued possible removal: ${filePath} (${pendingRemovals.size} pending)`);

      for (const [addedPath, addedFile] of pendingAdds) {
        if (addedFile.dirName === dirName && addedFile.baseName !== baseName) {
          log.info(`File renamed: ${filePath} -> ${addedPath}`);

          handleRenameOrMove(filePath, addedPath);

          pendingRemovals.delete(filePath);
          isAdded = false;
          return;
        }

        if (addedFile.baseName === baseName && addedFile.dirName !== dirName) {
          log.info(`File moved: ${filePath} -> ${addedPath}`);
          handleRenameOrMove(filePath, addedPath);

          pendingRemovals.delete(filePath);
          isAdded = false;
          return;
        }
      }

      setTimeout(() => {
        if (isRemoved) {
          log.info(`File removed: ${filePath}`);
          handleRemove(filePath);
        } else {
          log.debug(`Removal of ${filePath} was part of a rename/move`);
        }
        pendingRemovals.delete(filePath);
        isRemoved = true;
      }, renameDelay);
    });

    // Handle errors
    watcher.on("error", (error) => log.error("File watcher error:", error));
  } else {
    log.warn(`Not watching for file changes: folder ${pathToWatch || "(not set)"} not found`);
    return;
  }

  setTimeout(() => {
    isInit = false;
    log.debug("File watcher ready");
  }, initTime);
}

function handleRenameOrMove(oldPath, newPath) {
  settings = store.read();
  let settingsUpdated = false;
  settings.buckets.forEach((bucket) => {
    bucket.media.forEach((file) => {
      if (
        file.file === path.basename(oldPath) &&
        file.dir === path.dirname(oldPath).replace(settings.settings.loc, "")
      ) {
        file.file = path.basename(newPath);
        file.dir = path.dirname(newPath).replace(settings.settings.loc, "");
        log.info(`Bucket "${bucket.name}": updated ${path.basename(oldPath)} to ${path.basename(newPath)}`);
        settingsUpdated = true;
      }
    });
  });
  if (settingsUpdated) {
    try {
      store.write(settings);
      refreshPrerolls();
    } catch (err) {
      log.error("Could not save bucket changes:", err);
    }
  }
  broadcastUpdate();
}

function handleRemove(oldPath) {
  settings = store.read();

  if (settings.settings.deletion !== "2") {
    let settingsUpdated = false;

    settings.buckets.forEach((bucket) => {
      const initialMediaLength = bucket.media.length;

      bucket.media = bucket.media.filter(
        (file) =>
          !(
            file.file === path.basename(oldPath) &&
            file.dir === path.dirname(oldPath).replace(settings.settings.loc, "")
          ),
      );

      if (bucket.media.length !== initialMediaLength) {
        log.info(`Bucket "${bucket.name}": removed ${path.basename(oldPath)}`);
        settingsUpdated = true;
      }
    });

    if (settingsUpdated) {
      try {
        store.write(settings);
        refreshPrerolls();
      } catch (err) {
        log.error("Could not save bucket changes:", err);
      }
    } else {
      log.debug(`${oldPath} was not in any bucket`);
    }
    broadcastUpdate();
  } else {
    log.info(`Kept ${path.basename(oldPath)} in buckets ("Prevent File Deletion From Buckets" is on)`);
  }
}

initializeWatcher();

router.get("/", function (req, res, next) {
  initializeWatcher();
  res.status(200).send();
});

module.exports = router;
