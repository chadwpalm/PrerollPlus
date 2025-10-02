var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");

var logger = require("./backend/logger");
var webhookRouter = require("./webhook/index");
var uiRouter = require("./frontend/index");
var load = require("./backend/load");
var save = require("./backend/save");
var thumb = require("./backend/thumb");
var settings = require("./backend/settings");
var directory = require("./backend/directory");
var streamer = require("./backend/streamer");
var monitor = require("./backend/monitor");
var holiday = require("./backend/holiday");
var clearCache = require("./backend/clearcache");

var app = express();

// logger.token("customDate", function () {
//   var current_ob = new Date();
//   var date = "[" + current_ob.toLocaleDateString("en-CA") + " " + current_ob.toLocaleTimeString("en-GB") + "]";
//   return date;
// });
// app.use(logger(":customDate [INFO]  :method :url - Status: :status"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "frontend/production")));

app.use("/", uiRouter);
app.use("/backend/logger", logger);
app.use("/backend/load", load);
app.use("/backend/save", save);
app.use("/backend/thumb", thumb);
app.use("/backend/settings", settings);
app.use("/backend/directory", directory);
app.use("/backend/streamer", streamer);
app.use("/backend/monitor", monitor);
app.use("/backend/holiday", holiday);
app.use("/backend/clearcache", clearCache);

app.use("/webhook", webhookRouter);
app.use("/*", uiRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  console.error(err);
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
