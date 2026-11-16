var express = require("express");
var router = express.Router();
const { getHostInfo } = require("./config");

// Read-only: the port/URL base the server is running with and whether env vars override settings
router.get("/", function (req, res) {
  res.json(getHostInfo());
});

module.exports = router;
