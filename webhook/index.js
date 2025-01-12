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

async function isHolidayDay(country, holiday) {
  const today = new Date();
  const currentYear = today.getFullYear();

  // Set today to midnight of the current day (local time)
  today.setHours(0, 0, 0, 0); // Normalize today's date to midnight

  var url = `https://date.nager.at/api/v3/publicholidays/${currentYear}/${country}`;

  try {
    const response = await axios.get(url, {
      timeout: 2000,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
      },
    });

    const data = response.data.find((item) => item.name === holiday);

    if (!data) {
      console.log("Holiday not found:", holiday);
      return false; // Holiday not found, return false
    }

    // Use the UTC format to ensure the date is interpreted in UTC
    const holidayDate = new Date(`${data.date}T00:00:00Z`);

    // Set holidayDate to midnight (UTC) for comparison
    holidayDate.setUTCHours(0, 0, 0, 0);

    // Now compare only the year, month, and day of both dates
    const isHolidayToday =
      holidayDate.getUTCFullYear() === today.getUTCFullYear() &&
      holidayDate.getUTCMonth() === today.getUTCMonth() &&
      holidayDate.getUTCDate() === today.getUTCDate();

    return isHolidayToday; // Return the comparison result (true or false)
  } catch (error) {
    console.error("Error while trying to connect to the Public Holiday API: ", error.message);
    return false; // Return false on error
  }
}

async function checkSchedule() {
  let index = -1;
  let foundDateMatch = false;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set today to midnight (local time)
  const currentYear = today.getFullYear();

  // Convert today's date to a number that can be compared to other dates
  const todayNumber = new Date(Date.UTC(currentYear, today.getMonth(), today.getDate())).getTime();

  for (let idx = 0; idx < settings.sequences.length; idx++) {
    const element = settings.sequences[idx];

    if (element.schedule === "3") {
      const isHoliday = await isHolidayDay(element.country, element.holiday);

      if (isHoliday) {
        index = idx;
        foundDateMatch = true;
        break;
      }
      continue;
    }

    if (element.schedule === "2") {
      if (!foundDateMatch) {
        index = idx;
      }
      continue; // Skip to the next element
    }

    // Convert the sequence start and end dates to timestamps for comparison (UTC)
    if (!foundDateMatch) {
      const startNumber = new Date(Date.UTC(currentYear, element.startMonth - 1, element.startDay)).getTime();
      const endNumber = new Date(Date.UTC(currentYear, element.endMonth - 1, element.endDay)).getTime();

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
  }

  return index;
}

async function createList(index) {
  let plexString = "";
  if (index !== -1) {
    const bucketIds = settings.sequences[index].buckets;
    let usedFiles = new Set(); // Set to keep track of used files

    // Using `for...of` loop to await `axios` inside the loop
    for (const [idx, bucketId] of bucketIds.entries()) {
      let files = [];
      const info = settings.buckets.find(({ id }) => id === bucketId.id.toString());

      if (info.source === "2") {
        try {
          const response = await axios.post(
            "http://localhost:4949/backend/directory",
            { dir: `${info.dir}` },
            {
              headers: {
                "Content-Type": "application/json;charset=UTF-8",
              },
            }
          );
          console.log(response.data);
          response.data.forEach((media) => {
            if (!media.isDir)
              files.push(`${settings.settings.plexLoc}${info.dir.replace(settings.settings.loc, "")}/${media.name}`);
          });
        } catch (error) {
          if (error.response) {
            console.error("Server responded with error:", error.response.data);
          } else if (error.request) {
            console.error("No response received:", error.request);
          } else {
            console.error("Error setting up request:", error.message);
          }
        }
      } else {
        info.media.forEach((media) => {
          files.push(`${settings.settings.plexLoc}${media.dir}/${media.file}`);
        });
      }

      if (files.length !== 0) {
        let randomFile;
        do {
          randomFile = files[Math.floor(Math.random() * files.length)]; // Fix: `info.media.length` -> `files.length`
        } while (usedFiles.has(randomFile)); // Keep picking until an unused file is found

        usedFiles.add(randomFile); // Mark the selected file as used

        if (idx === bucketIds.length - 1) {
          plexString += randomFile;
        } else {
          plexString += randomFile + ",";
        }
      }
    }
  }
  return plexString;
}

async function sendList(string) {
  const url = `http${settings.settings.ssl ? "s" : ""}://${settings.settings.ip}:${settings.settings.port}/:/prefs`;

  await axios
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

async function doTask() {
  const index = await checkSchedule();
  const string = await createList(index);
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
