var express = require("express");
var router = express.Router();
var multer = require("multer");
var fs = require("fs");
var axios = require("axios").default;
var https = require("https");
var path = require("path");
const { setTimeout: setTimeoutPromise } = require("timers/promises");
const { error } = require("console");

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

  for (let idx = 0; idx < settings.sequences.length; idx++) {
    const element = settings.sequences[idx];

    if (element.schedule === "2") {
      if (!foundDateMatch) {
        index = idx;
      }
      continue; // Skip to the next element
    }

    const startDate = new Date(currentYear, element.startMonth - 1, element.startDay);
    const endDate = new Date(currentYear, element.endMonth - 1, element.endDay);

    // Check date ranges including wrap-around
    if (
      (startDate <= endDate && today >= startDate && today <= endDate) ||
      (startDate > endDate &&
        (today >= startDate || today <= new Date(currentYear + 1, element.endMonth - 1, element.endDay)))
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
    bucketIds.forEach((bucketId, idx) => {
      var files = [];
      var info = settings.buckets.find(({ id }) => id === bucketId.id.toString());
      info.media.forEach((media) => {
        files.push(
          `${settings.build === "Native" ? settings.settings.loc : settings.settings.plexLoc}${media.dir}/${media.file}`
        );
      });
      if (idx === bucketIds.length - 1) {
        plexString += files[Math.floor(Math.random() * info.media.length)];
      } else {
        plexString += files[Math.floor(Math.random() * info.media.length)] + ",";
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

// Periodic Task to Check Schedules
async function myAsyncTask() {
  try {
    // Your async code here
    console.log("Task running...");
    // Simulate an async operation, like fetching data
  } catch (error) {
    console.error("Error in async task:", error);
  }
}

// Set the task to run every 10 seconds (10000 milliseconds)
// setInterval(myAsyncTask, 5000);

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

module.exports = router;
