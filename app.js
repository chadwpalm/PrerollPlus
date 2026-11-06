var createError = require("http-errors");
var express = require("express");
var path = require("path");
var fs = require("fs");
const logger = require("./backend/logger");
const { getBaseURL } = require("./backend/config");
const httpLog = logger.tagged("HTTP");

var webhookRouter = require("./webhook/index");
var feedRouter = require("./feed/index");
var load = require("./backend/load");
var save = require("./backend/save");
var thumb = require("./backend/thumb");
var settings = require("./backend/settings");
var directory = require("./backend/directory");
var streamer = require("./backend/streamer");
var monitor = require("./backend/monitor");
var holiday = require("./backend/holiday");
var clearCache = require("./backend/clearcache");
var host = require("./backend/host");

var app = express();

// URL base for reverse proxies, e.g. "/prerollplus" ("" = root). Everything is mounted under it.
const base = getBaseURL();
const basePath = base + "/";
const frontendDir = path.join(__dirname, "frontend/production");

// Debug: one line per API/webhook/feed request (static files and video streaming are skipped)
app.use((req, res, next) => {
  if (!/\/(backend|webhook|feed)(\/|$)/.test(req.path) || req.path.includes("/backend/streamer/")) return next();
  const start = process.hrtime.bigint();
  const path = req.path; // routers rewrite req.path while handling, so capture it now
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    httpLog.debug(`${req.method} ${path} ${res.statusCode} ${ms.toFixed(0)}ms`);
  });
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (base) {
  // "/" and "/prerollplus" -> "/prerollplus/"
  app.use((req, res, next) => {
    if (req.path === "/" || req.path === base) return res.redirect(302, basePath);
    next();
  });
}

var routes = express.Router();

routes.use(express.static(frontendDir, { index: false }));

routes.use("/backend/load", load);
routes.use("/backend/save", save);
routes.use("/backend/thumb", thumb);
routes.use("/backend/settings", settings);
routes.use("/backend/directory", directory);
routes.use("/backend/streamer", streamer);
routes.use("/backend/monitor", monitor);
routes.use("/backend/holiday", holiday);
routes.use("/backend/clearcache", clearCache);
routes.use("/backend/host", host);
routes.use("/webhook", webhookRouter);
routes.use("/feed", feedRouter);

// Single-page app: any other GET returns index.html so client-side routes work.
// <base href> makes the relative asset and API URLs in the frontend resolve under the URL base,
// and window.__BASE_PATH__ tells React Router its basename.
routes.get("/{*splat}", (req, res, next) => {
  fs.readFile(path.join(frontendDir, "index.html"), "utf8", (err, html) => {
    if (err) return next(err);
    const inject = `<base href="${basePath}" /><script>window.__BASE_PATH__=${JSON.stringify(basePath)};</script>`;
    res
      .set("Cache-Control", "no-cache")
      .type("html")
      .send(html.replace("<head>", `<head>${inject}`));
  });
});

app.use(base || "/", routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler (no view engine is configured, so reply with JSON or plain text)
app.use(function (err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) httpLog.error(`${req.method} ${req.originalUrl.split("?")[0]} failed:`, err);
  const message = err.expose ? err.message : status >= 500 ? "Internal Server Error" : err.message;
  res.status(status);
  if (req.accepts("json")) res.json({ error: message });
  else res.type("text/plain").send(message);
});

module.exports = app;
