var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");

var logger = require("./backend/logger");
var webhookRouter = require("./webhook/index");
var load = require("./backend/load");
var save = require("./backend/save");
var thumb = require("./backend/thumb");
var settings = require("./backend/settings");
var directory = require("./backend/directory");
var streamer = require("./backend/streamer");
var monitor = require("./backend/monitor");
var holiday = require("./backend/holiday");
var clearCache = require("./backend/clearcache");
const { getBaseURL } = require("./backend/config");

var app = express();

const baseURL = (getBaseURL() || "").replace(/\/$/, "");

console.log(`[APP] Preroll Plus Base URL: "${baseURL}" (empty = running at root)`);

let base = baseURL;
if (base && !base.startsWith("/")) {
  base = "/" + base;
}

if (base) {
  app.get("/", (req, res) => {
    res.redirect(base + "/");
  });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(base + "/backend/logger", logger);
app.use(base + "/backend/load", load);
app.use(base + "/backend/save", save);
app.use(base + "/backend/thumb", thumb);
app.use(base + "/backend/settings", settings);
app.use(base + "/backend/directory", directory);
app.use(base + "/backend/streamer", streamer);
app.use(base + "/backend/monitor", monitor);
app.use(base + "/backend/holiday", holiday);
app.use(base + "/backend/clearcache", clearCache);
app.use(base + "/webhook", webhookRouter);

app.use(
  base,
  express.static(path.join(__dirname, "frontend/production"), {
    redirect: false,
  }),
);

app.get(base + "*", (req, res) => {
  const indexPath = path.join(__dirname, "frontend/production", "index.html"); // correct join
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("[SPA] Failed to send index.html:", err);
      res.status(500).send("Failed to load application");
    }
  });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status);

  if (req.accepts("json")) {
    res.json({ error: err.message || "Internal Server Error" });
  } else {
    res.type("text/plain").send("Internal Server Error");
  }
});

module.exports = app;
