var express = require("express");
var router = express.Router();
var fs = require("fs");
const { createLogger, format, transports } = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

function setLogLevel() {
  let level = "info";
  try {
    if (fs.existsSync("/config/settings.js")) {
      const settings = JSON.parse(fs.readFileSync("/config/settings.js"));
      level = settings.settings?.logLevel === "1" ? "debug" : "info";
    }
  } catch (err) {
    console.error("Error reading or parsing settings.js:", err);
  }

  const logger = createLogger({
    level: level,
    format: format.combine(
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.printf((info) => `[${info.timestamp}] [${info.level}] ${info.message}`)
    ),
    transports: [
      new transports.Console(),
      new DailyRotateFile({
        filename: "/config/logs/prerollplus-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "5",
      }),
    ],
  });

  // Override default console methods
  console.log = (...args) => logger.log("info", args.join(" "));
  console.info = (...args) => logger.log("info", args.join(" "));
  console.error = (...args) => logger.log("error", args.join(" "));
  console.warn = (...args) => logger.log("warn", args.join(" "));
  console.debug = (...args) => logger.log("debug", args.join(" "));

  console.info(`Log level set to "${level}"`);
}

setLogLevel();

router.get("/", function (req, res, next) {
  setLogLevel();
  res.status(200).send();
});

module.exports = router;
