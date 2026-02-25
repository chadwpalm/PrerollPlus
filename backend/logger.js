var express = require("express");
var router = express.Router();
var fs = require("fs");
const { createLogger, format, transports } = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

var settings;

function setLogLevel() {
  let level = "info";
  let size = "1";
  let files = "5";
  try {
    if (fs.existsSync("/config/settings.js")) {
      settings = JSON.parse(fs.readFileSync("/config/settings.js"));
      level = settings?.settings?.logLevel === "1" ? "debug" : level;
      size = settings?.settings?.logSize ?? size;
      files = settings?.settings?.logFiles ?? files;
    }
  } catch (err) {
    console.error("Error reading or parsing settings.js:", err);
  }

  const logger = createLogger({
    level: level,
    format: format.combine(
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.printf((info) => {
        const paddedLevel = info.level.toUpperCase().padEnd(5);
        const timestamp = info.timestamp.padEnd(19);
        return `[${timestamp}] [${paddedLevel}] ${info.message}`;
      }),
    ),
    transports: [
      new transports.Console(),
      new DailyRotateFile({
        filename: "/config/logs/prerollplus-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        maxSize: `${size}m`,
        maxFiles: `${files}`,
      }),
    ],
  });

  // Override default console methods
  console.log = (...args) => logger.log("info", args.join(" "));
  console.info = (...args) => logger.log("info", args.join(" "));
  console.error = (...args) => logger.log("error", args.join(" "));
  console.warn = (...args) => logger.log("warn", args.join(" "));
  console.debug = (...args) => logger.log("debug", args.join(" "));

  console.info(`[LOGGER] Log level set to "${level}"`);
  console.info(`[LOGGER] Log Size limit set to ${size}MB`);
  console.info(`[LOGGER] Max files set to ${files}`);
}

setLogLevel();

router.get("/", function (req, res, next) {
  setLogLevel();
  res.status(200).send();
});

module.exports = router;
