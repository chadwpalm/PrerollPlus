var express = require("express");
var router = express.Router();
var multer = require("multer");
var fs = require("fs");
var axios = require("axios").default;

// Global Variables

var flag = false;

var upload = multer({ dest: "/tmp/" });

const filePath = "/config/settings.js";

var settings;

// General Functions

function checkSchedule() {
  let index = -1;
  let foundDateMatch = false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();

  // Convert today's date to a number that can be compared to other dates
  const todayNumber = new Date(currentYear, today.getMonth(), today.getDate()).getTime();

  for (let idx = 0; idx < settings.sequences.length; idx++) {
    const element = settings.sequences[idx];

    if (element.schedule === "2") {
      if (!foundDateMatch) {
        index = idx;
      }
      continue; // Skip to the next element
    }

    // Convert the sequence start and end dates to timestamps for comparison
    const startNumber = new Date(currentYear, element.startMonth - 1, element.startDay).getTime();
    const endNumber = new Date(currentYear, element.endMonth - 1, element.endDay).getTime();

    // Handle ranges that do not wrap and those that do wrap around the end of the year
    const isWrapped = startNumber > endNumber;

    if (
      (isWrapped && (todayNumber >= startNumber || todayNumber <= endNumber)) ||
      (!isWrapped && todayNumber >= startNumber && todayNumber <= endNumber)
    ) {
      index = idx;
      foundDateMatch = true;
      break; // Break early if a match is found
    }
  }

  return index;
}

function createList(index) {
  var plexString = "";
  if (index !== -1) {
    const bucketIds = settings.sequences[index].buckets;
    let usedFiles = new Set(); // Set to keep track of used files

    bucketIds.forEach((bucketId, idx) => {
      var files = [];
      var info = settings.buckets.find(({ id }) => id === bucketId.id.toString());

      info.media.forEach((media) => {
        files.push(`${settings.settings.plexLoc}${media.dir}/${media.file}`);
      });

      if (files.length !== 0) {
        let randomFile;
        do {
          randomFile = files[Math.floor(Math.random() * info.media.length)];
        } while (usedFiles.has(randomFile)); // Keep picking until an unused file is found

        usedFiles.add(randomFile); // Mark the selected file as used

        if (idx === bucketIds.length - 1) {
          plexString += randomFile;
        } else {
          plexString += randomFile + ",";
        }
      }
    });
  }
  return plexString;
}

async function sendList(string) {
  const url = `http${settings.settings.ssl ? "s" : ""}://${settings.settings.ip}:${settings.settings.port}/:/prefs`;

  axios
    .put(url, null, {
      headers: {
        "X-Plex-Token": `${settings.token}`,
      },
      params: {
        CinemaTrailersPrerollID: string,
      },
    })
    .then((response) => {
      console.log("Preroll updated successfully: ", string);
    })
    .catch((error) => {
      console.error("Error updating preroll:", error);
    });
}

function doTask() {
  const index = checkSchedule();
  const string = createList(index);
  sendList(string);
}

// Function to calculate delay until the desired time (3:00 PM)
function getDelayUntilTargetTime(hour, minute) {
  const now = new Date();
  const targetTime = new Date();

  targetTime.setHours(hour, minute, 0, 0); // Set target time to 3:00 PM today

  if (targetTime <= now) {
    // If the target time has already passed today, schedule for tomorrow
    targetTime.setDate(targetTime.getDate() + 1);
  }

  // Calculate the delay in milliseconds
  return targetTime - now;
}

// Schedule the initial run
const delay = getDelayUntilTargetTime(0, 0); // 3:00 PM

// Periodic Task to Check Schedules
function myAsyncTask() {
  try {
    settings = JSON.parse(fs.readFileSync(filePath));
    // Your async code here
    console.log("Task running...");
    doTask();
  } catch (error) {
    console.error("Error in async task:", error);
  }
}

// Set the task to run every day
setTimeout(() => {
  myAsyncTask();

  setInterval(myAsyncTask, 24 * 60 * 60 * 1000);
}, delay);

router.post("/", upload.single("thumb"), async function (req, res, next) {
  var payload = JSON.parse(req.body.payload);
  settings = JSON.parse(fs.readFileSync(filePath));

  try {
    if (payload.event === "media.play" && payload.Metadata.type === "movie") {
      console.info("Movie has started. Updating prerolls");

      doTask();
    }
    res.sendStatus(200);
  } catch (e) {
    console.log("There was an error", e);
    res.sendStatus(200);
  }
});

router.get("/", function (req, res, next) {
  settings = JSON.parse(fs.readFileSync(filePath));
  doTask();
  res.sendStatus(200);
});

module.exports = router;
