var express = require("express");
var router = express.Router();
var fs = require("fs");
var path = require("path");
var chokidar = require("chokidar");
var axios = require("axios");

let settings = null;
let pathToWatch = null;
let watcher = null;

let pendingAdds = new Map(); // Store added files with timestamps
let renameDelay = 500; // Adjust this delay based on system responsiveness

function initializeWatcher() {
  if (watcher) {
    console.info("Closing existing watcher before reinitializing...");
    watcher.close();
    watcher = null;
  }

  try {
    settings = JSON.parse(fs.readFileSync("/config/settings.js"));
    pathToWatch = settings.settings.loc;
  } catch (err) {
    console.error("Cannot grab dir location", err);
    return;
  }

  console.info("Watching", pathToWatch, "for changes");

  watcher = chokidar.watch(pathToWatch, {
    ignored: /(^|[\/\\])\../, // Ignore dotfiles
    persistent: true,
  });

  watcher
    .on("add", (filePath) => {
      const baseName = path.basename(filePath);
      const dirName = path.dirname(filePath);
      const timestamp = Date.now();

      //   console.info(`File added: ${filePath}`);

      // Store the file in the pendingAdds map with a timestamp
      pendingAdds.set(filePath, { baseName, dirName, timestamp });

      // Delay handling to check if a rename has occurred
      setTimeout(() => {
        if (pendingAdds.has(filePath)) {
          // If the file is still in the map, treat it as a new file (no unlink event matched)
          //   console.info(`File ${filePath} is confirmed as a new file.`);
          pendingAdds.delete(filePath);
        }
      }, renameDelay);
    })
    .on("unlink", (filePath) => {
      const baseName = path.basename(filePath);
      const dirName = path.dirname(filePath);
      // console.info(`File removed: ${filePath}`);

      // Check if this is a rename by looking for a matching added file
      for (const [addedPath, addedFile] of pendingAdds) {
        // Handle files within the same directory
        if (addedFile.dirName === dirName && addedFile.baseName !== baseName) {
          console.info(`File ${filePath} was renamed to ${addedPath}`);
          handleRename(filePath, addedPath);

          // Clean up both the added and removed paths
          pendingAdds.delete(addedPath);
          return;
        }
        // Handle files across different directories
        if (addedFile.baseName === baseName && addedFile.dirName !== dirName) {
          console.info(`File ${filePath} was moved to ${addedPath}`);
          handleRename(filePath, addedPath);

          // Clean up both the added and removed paths
          pendingAdds.delete(addedPath);
          return;
        }
      }

      // If no match is found, treat it as a normal file removal
      console.info(`File ${filePath} has been removed.`);
      handleRemove(filePath);
    });

  // Handle any errors
  watcher.on("error", (error) => console.error(`Watcher error: ${error}`));
}

function handleRename(oldPath, newPath) {
  settings = JSON.parse(fs.readFileSync("/config/settings.js"));
  console.info(`Handling rename from ${oldPath} to ${newPath} in buckets`);
  settings.buckets.forEach((bucket) => {
    bucket.media.forEach((file) => {
      if (file.file === path.basename(oldPath) && file.dir === path.dirname(oldPath).replace("/prerolls", "")) {
        file.file = path.basename(newPath);
        file.dir = path.dirname(newPath).replace("/prerolls", "");
        console.info(`Updated settings for renamed file: ${oldPath} to ${newPath} in bucket "${bucket.name}"`);

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
    });
  });
}

function handleRemove(oldPath) {
  settings = JSON.parse(fs.readFileSync("/config/settings.js"));
  console.info(`Handling removal of ${oldPath} in buckets...`);

  let settingsUpdated = false;

  settings.buckets.forEach((bucket) => {
    // Filter out all files in the media array that match the oldPath
    const initialMediaLength = bucket.media.length;

    bucket.media = bucket.media.filter(
      (file) => !(file.file === path.basename(oldPath) && file.dir === path.dirname(oldPath).replace("/prerolls", ""))
    );

    if (bucket.media.length !== initialMediaLength) {
      console.info(`Removed all occurrences of ${oldPath} from bucket "${bucket.name}"`);
      settingsUpdated = true;
    } else {
      console.info(`No occurrences of ${oldPath} found in bucket "${bucket.name}"`);
    }
  });

  // Save the settings only once, if any file was removed
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
}

initializeWatcher();

router.get("/", function (req, res, next) {
  initializeWatcher();
  res.status(200).send();
});

module.exports = router;
