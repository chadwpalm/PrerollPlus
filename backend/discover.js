var express = require("express");
var router = express.Router();
var axios = require("axios").default;
var mdns = require("mdns-js");

mdns.excludeInterface("0.0.0.0");

var TIMEOUT = 2000;

router.post("/", function (req, res, next) {
  var ips = [];
  var list = [];
  var browser = mdns.createBrowser();

  browser.on("ready", function () {
    console.info("Searching for bridges using mDNS");
    browser.discover();
  });

  browser.on("update", function (data) {
    if (data.type[0].name === "hue" && data.interfaceIndex === 0) {
      ips.push(data.addresses[0]);
      console.info("Found: ", data.addresses[0]);
    }
  });

  setTimeout(async function onTimeout() {
    browser.stop();
    console.info("Finished searching for bridges using mDNS");

    if (!Object.keys(req.body).length) {
      if (ips.length === 0) {
        console.info("No bridges found using mDNS, using Hue Discovery");

        var url = `https://discovery.meethue.com`;
        await axios
          .get(url, { headers: { "Content-Type": "application/json;charset=UTF-8" } })
          .then(function (response) {
            var data = response.data;

            for (const obj of data) {
              ips.push(obj.internalipaddress);
            }
          })
          .catch(function (error) {
            if (error.request) {
              if (error.message === "getaddrinfo ENOTFOUND discovery.meethue.com") {
                console.error("Could not connect to Hue Discovery. Check internet connection.");
              } else if (error.message === "Request failed with status code 429") {
                console.error(
                  "Could not get bridges from Hue Discovery due to reaching rate limit. Try again in 15 minutes."
                );
              } else {
                console.error("Could not connect to Hue Discovery website: ", error.message);
              }
            }
          });
      }
    } else {
      ips.push(req.body.ip);
    }

    for (const ip of ips) {
      var url = `http://${ip}/api/0/config`;

      await axios
        .get(url, { headers: { "Content-Type": "application/json;charset=UTF-8" } })
        .then(function (response) {
          var data = response.data;

          let element = `{ "Id":"${data.bridgeid}", "IP":"${ip}", "name":"${data.name}" }`;
          console.info(data.name + " found at", ip);
          list.push(JSON.parse(element));
        })
        .catch(function (error) {
          if (error.request) {
            console.error("Bridge not online at", ip);
          }
        });
    }
    res.send(list);
  }, TIMEOUT);
});

module.exports = router;
