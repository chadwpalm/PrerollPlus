var express = require("express");
var router = express.Router();
var axios = require("axios").default;
var parser = require("xml-js");

router.post("/", async function (req, res, next) {
  var serverList = [];
  var finalList = [];
  var message = [];
  var unauth = false;

  var url = "https://plex.tv/api/servers";

  await axios
    .get(url, { timeout: 10000, params: { "X-Plex-Token": req.body.token } })

    .then(function (response) {
      console.info("Retrieving Plex Servers");

      var servers = parser.xml2js(response.data, { compact: true, spaces: 4 }).MediaContainer.Server;

      if (Array.isArray(servers)) {
        serverList = servers;
      } else if (!servers || servers === undefined) {
        servers = [];
      } else {
        serverList.push(servers);
      }
    })
    .catch(function (error) {
      if (error.response.status === 401) {
        unauth = true;
      }
      console.error("Issue with connection to online Plex account while requesting servers: ", error.message);
      message.push("Issue with connection to online Plex account while requesting servers. Check logs for reason.");
    });

  for (const element of serverList) {
    var certId;
    var info = {};
    var url = `http://${element._attributes.localAddresses}:32400/:/prefs`;

    await axios
      .get(url, { timeout: 10000, params: { "X-Plex-Token": req.body.token } })

      .then(function (response) {
        console.info("Retrieving Cert");

        certId = response.data.MediaContainer.Setting.find((id) => id.id === "CertificateUUID");

        info = {
          name: `${element._attributes.name}`,
          localIP: `${element._attributes.localAddresses}`,
          remoteIP: `${element._attributes.address}`,
          port: `${element._attributes.port}`,
          cert: `${certId.value}`,
        };

        finalList.push(info);
      })
      .catch(function (error) {
        unauth = true;

        console.error("Issue with connection to Plex Server: ", error.message);
        message.push("Issue with connection to Plex Server. Check logs for reason.");
      });
  }

  if (message.length !== 0) {
    if (unauth) {
      res.status(401).send(JSON.stringify([]));
    } else {
      res.status(403).send(JSON.stringify(message));
    }
  } else {
    res.send(JSON.stringify(finalList));
  }
});

module.exports = router;
