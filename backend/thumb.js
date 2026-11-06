var express = require("express");
var router = express.Router();
var axios = require("axios").default;
var parser = require("xml-js");
const log = require("./logger").tagged("PLEX");

router.post("/", async function (req, res, next) {
  var url = "https://plex.tv/users/account";

  await axios
    .get(url, { params: { "X-Plex-Token": req.body.token } })

    .then(function (response) {
      let thumb = parser.xml2js(response.data, { compact: true, spaces: 4 }).user._attributes.thumb;
      let username = parser.xml2js(response.data, { compact: true, spaces: 4 }).user._attributes.username;
      let email = parser.xml2js(response.data, { compact: true, spaces: 4 }).user._attributes.email;

      let data = { thumb, username, email };
      log.debug(`Plex account: ${username}`);

      res.send(JSON.stringify(data));
    })
    .catch(function (error) {
      if (error.request) {
        log.error("Could not get the account details from plex.tv:", error);
        res.status(403).send("Could not connect to the Plex server");
      }
    });
});

module.exports = router;
