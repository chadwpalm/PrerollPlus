var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
const fs = require("fs");
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
  app.use((req, res, next) => {
    if (req.path === "/") return res.redirect(302, base + "/");
    if (req.path === base) return res.redirect(302, base + "/");
    next();
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

if (base) {
  app.use(base + "/", express.static(path.join(__dirname, "frontend/production"), { index: false }));
} else {
  app.use(express.static(path.join(__dirname, "frontend/production"), { index: false }));
}

const spaHandler = (req, res) => {
  const indexPath = path.join(__dirname, "frontend/production", "index.html");

  fs.readFile(indexPath, "utf8", (err, data) => {
    if (err) {
      console.error("[SPA] Failed to read index.html:", err);
      return res.status(500).send("Failed to load application");
    }

    const basePath = base ? base + "/" : "/";
    const injected = data.replace("<head>", `<head><script>window.__BASE_PATH__="${basePath}";</script>`);

    res.send(injected);
  });
};

if (base) {
  app.use(base + "/", spaHandler);
} else {
  app.use("/", spaHandler);
}

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
