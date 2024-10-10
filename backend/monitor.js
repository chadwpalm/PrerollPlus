var express = require("express");
var router = express.Router();
var fs = require("fs");
var path = require("path");
var chokidar = require("chokidar");
var axios = require("axios");
var WebSocket = require("ws");

let pendingAdds = new Map(); // Store added files with relevant information
let pendingRemovals = new Map(); // Track removed files
let renameDelay; // Delay for rename detection
let pathToWatch = "";
let isRemoved = true;
let isAdded = true;
let watcher = null;
let isInit = true;
let initTime = 2000;

// WebSocket server setup
const wss = new WebSocket.Server({ port: 4848 }); // Choose an appropriate port

wss.on("connection", (ws) => {
  console.log("Client connected");
  ws.on("message", (message) => {
    console.log("Received message from client:", message);
  });
});

function broadcastUpdate() {
  console.info("Sending update");
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send("update-config");
    }
  });
}

function initializeWatcher() {
  if (watcher) {
    console.info("Closing existing watcher before reinitializing...");
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
    console.error("Cannot grab dir location", err);
    return;
  }

  if (fs.existsSync(pathToWatch)) {
    watcher = chokidar.watch(pathToWatch, {
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
      persistent: true,
      usePolling: settings.settings.polling === "2",
      interval: 100,
    });

    watcher.on("addDir", (filePath) => {
      if (!isInit) {
        console.info(`Directory ${filePath} has been added`);
        broadcastUpdate();
      }
    });

    watcher.on("unlinkDir", (filePath) => {
      if (!isInit) {
        console.info(`Directory ${filePath} has been removed`);
        broadcastUpdate();
      }
    });

    // When a file is added
    watcher.on("add", (filePath) => {
      // console.log("ADD", filePath);
      filePath = filePath
        .replace(/@SynoEAStream/i, "")
        .replace(/@SynoResource/i, "")
        .replace(/@eaDir\//i, ""); // Fix for Synology issue
      const baseName = path.basename(filePath);
      const dirName = path.dirname(filePath);

      // Store the added file with its path
      pendingAdds.set(filePath, { baseName, dirName });
      // console.log("PA", pendingAdds);

      // Check for any corresponding removals
      for (const [removedPath, removedFile] of pendingRemovals) {
        if (removedFile.dirName === dirName && removedFile.baseName !== baseName) {
          console.info(`File ${removedPath} was renamed to ${filePath}`);
          // Execute your specific rename/move handling code here
          handleRenameOrMove(removedPath, filePath);

          // Clean up both the added and removed paths
          pendingAdds.delete(filePath);
          isRemoved = false;
          return;
        }
        if (removedFile.baseName === baseName && removedFile.dirName !== dirName) {
          console.info(`File ${removedPath} was moved to ${filePath}`);
          // Execute your specific rename/move handling code here
          handleRenameOrMove(removedPath, filePath);

          // Clean up both the added and removed paths
          pendingAdds.delete(filePath);
          isRemoved = false;
          return;
        }
      }

      // Delay to confirm if it's a rename
      setTimeout(() => {
        // console.log(`[ADD] Timout Ended\n\n\n\n\n`);
        if (!isInit && isAdded) {
          console.info(`File ${filePath} has been added`);
          broadcastUpdate();
        }
        if (pendingAdds.has(filePath)) {
          // Confirm it's still an add

          pendingAdds.delete(filePath);
          isAdded = true;
        }
      }, renameDelay);
    });

    // When a file is removed
    watcher.on("unlink", (filePath) => {
      // console.log("UNLINK", filePath);
      filePath = filePath
        .replace(/@SynoEAStream/i, "")
        .replace(/@SynoResource/i, "")
        .replace(/@eaDir\//i, ""); // Fix for Synology issue
      const baseName = path.basename(filePath);
      const dirName = path.dirname(filePath);

      // Store the removed file for potential rename detection
      pendingRemovals.set(filePath, { baseName, dirName });
      // console.log("PR", pendingRemovals);

      // Check for any corresponding adds

      for (const [addedPath, addedFile] of pendingAdds) {
        if (addedFile.dirName === dirName && addedFile.baseName !== baseName) {
          console.info(`File ${filePath} was renamed to ${addedPath}`);
          // Execute your specific rename/move handling code here
          handleRenameOrMove(filePath, addedPath);

          // Clean up both the added and removed paths
          pendingRemovals.delete(filePath);
          isAdded = false;
          return;
        }
        // Handle files across different directories
        if (addedFile.baseName === baseName && addedFile.dirName !== dirName) {
          console.info(`File ${filePath} was moved to ${addedPath}`);
          handleRenameOrMove(filePath, addedPath);

          pendingRemovals.delete(filePath);
          isAdded = false;
          return;
        }
      }

      // Delay to confirm if it's a rename
      setTimeout(() => {
        // console.log(`[UNLINK] Timout Ended\n\n\n\n\n`);
        if (isRemoved) {
          // If no corresponding add was found, treat it as a normal removal
          console.info(`File ${filePath} has been removed`);

          // Execute your specific removal handling code here
          handleRemove(filePath);
        }
        pendingRemovals.delete(filePath);
        isRemoved = true;
      }, renameDelay);
    });

    // Handle errors
    watcher.on("error", (error) => console.error(`Watcher error: ${error}`));
  } else {
    console.warn(`Watcher not started. Directory ${pathToWatch} not found`);
  }

  setTimeout(() => {
    isInit = false;
    console.info("Ready to start monitoring directories");
  }, initTime);
}

function handleRenameOrMove(oldPath, newPath) {
  settings = JSON.parse(fs.readFileSync("/config/settings.js"));
  console.info(`Handling rename from ${oldPath} to ${newPath} in buckets`);
  let settingsUpdated = false;
  settings.buckets.forEach((bucket) => {
    bucket.media.forEach((file) => {
      if (
        file.file === path.basename(oldPath) &&
        file.dir === path.dirname(oldPath).replace(settings.settings.loc, "")
      ) {
        file.file = path.basename(newPath);
        file.dir = path.dirname(newPath).replace(settings.settings.loc, "");
        console.info(`Updated settings for renamed file: ${oldPath} to ${newPath} in bucket "${bucket.name}"`);
        settingsUpdated = true;
      }
    });
  });
  if (settingsUpdated) {
    try {
      fs.writeFileSync("/config/settings.js", JSON.stringify(settings));
      console.info("Settings file saved");

      axios
        .get("http://localhost:4949/webhook") // Make sure the path is correct
        .then((response) => {})
        .catch((error) => {});
    } catch (err) {
      console.error("Error saving settings file", err);
    }
  }
  broadcastUpdate();
}

function handleRemove(oldPath) {
  settings = JSON.parse(fs.readFileSync("/config/settings.js"));
  console.info(`Handling removal of ${oldPath} in buckets...`);

  let settingsUpdated = false;

  settings.buckets.forEach((bucket) => {
    const initialMediaLength = bucket.media.length;

    bucket.media = bucket.media.filter(
      (file) =>
        !(file.file === path.basename(oldPath) && file.dir === path.dirname(oldPath).replace(settings.settings.loc, ""))
    );

    if (bucket.media.length !== initialMediaLength) {
      console.info(`Removed all occurrences of ${oldPath} from bucket "${bucket.name}"`);
      settingsUpdated = true;
    }
  });

  if (settingsUpdated) {
    try {
      fs.writeFileSync("/config/settings.js", JSON.stringify(settings));
      console.info("Settings file saved");
      axios
        .get("http://localhost:4949/webhook") // Make sure the path is correct
        .then((response) => {})
        .catch((error) => {});
    } catch (err) {
      console.error("Error saving settings file", err);
    }
  } else {
    console.info("No changes made to settings.");
  }
  broadcastUpdate();
}

initializeWatcher();

router.get("/", function (req, res, next) {
  initializeWatcher();
  res.status(200).send();
});

module.exports = router;
