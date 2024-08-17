var express = require("express");
var router = express.Router();
var axios = require("axios").default;
var fs = require("fs");
var path = require("path");
var https = require("https");

const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // (NOTE: this will disable client verification)
  cert: fs.readFileSync(path.resolve(__dirname, "bridgecert.pem")),
});

router.post("/", async function (req, res, next) {
  var rooms = {};
  var zones = {};
  var lights = [];
  var groupList = [];
  var output = [];

  var url = `https://${req.body.bridge.ip}/clip/v2/resource/room`;

  await axios
    .get(url, {
      timeout: 10000,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "hue-application-key": `${req.body.bridge.user}`,
      },
      httpsAgent,
    })
    .then(function (response) {
      console.info("Retrieving Rooms");
      rooms = response.data.data;
      for (const [key, value] of Object.entries(rooms)) {
        try {
          let array = `{ "Room":"${value.metadata.name}", "Type":"Room"}`;

          groupList.push(JSON.parse(array));
        } catch (error) {
          console.error("GroupList: ", error);
        }
      }
    })
    .catch(function (error) {
      console.error("Error while trying to connect to the Hue bridge while requesting rooms: ", error.message);
      message.push("Could not connect to the Hue Bridge while requesting rooms");
    });

  var url = `https://${req.body.bridge.ip}/clip/v2/resource/zone`;

  await axios
    .get(url, {
      timeout: 10000,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "hue-application-key": `${req.body.bridge.user}`,
      },
      httpsAgent,
    })
    .then(function (response) {
      console.info("Retrieving Zones");
      zones = response.data.data;
      for (const [key, value] of Object.entries(zones)) {
        try {
          let array = `{ "Room":"${value.metadata.name}", "Type":"Zone"}`;

          groupList.push(JSON.parse(array));
        } catch (error) {
          console.error("GroupList: ", error);
        }
      }
    })
    .catch(function (error) {
      console.error("Error while trying to connect to the Hue bridge while requesting rooms: ", error.message);
      message.push("Could not connect to the Hue Bridge while requesting rooms");
    });

  url = `https://${req.body.bridge.ip}/clip/v2/resource/light`;

  await axios
    .get(url, {
      timeout: 10000,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "hue-application-key": `${req.body.bridge.user}`,
      },
      httpsAgent,
    })
    .then(function (response) {
      console.info("Retrieving Lights");
      var data = {};
      data = response.data.data;
      data.forEach((light) => {
        rooms.forEach((room) => {
          room.children.forEach((child) => {
            if (child.rid === light.owner.rid) {
              try {
                let array = `{ "Id":"${light.id}", "Name":"${light.metadata.name}", "Room":"${room.metadata.name}"}`;
                lights.push(JSON.parse(array));
              } catch (error) {
                console.error("Lights: ", error);
              }
            }
          });
        });
      });

      data.forEach((light) => {
        zones.forEach((zone) => {
          zone.children.forEach((child) => {
            if (child.rid === light.id) {
              try {
                let array = `{ "Id":"${light.id}", "Name":"${light.metadata.name}", "Room":"${zone.metadata.name}"}`;
                lights.push(JSON.parse(array));
              } catch (error) {
                console.error("Lights: ", error);
              }
            }
          });
        });
      });

      lights.sort((a, b) => (a.Name > b.Name ? 1 : b.Name > a.Name ? -1 : 0));
      lights.sort((a, b) => (a.Room > b.Room ? 1 : b.Room > a.Room ? -1 : 0));

      output.push(lights);
      output.push(groupList);
    })
    .catch(function (error) {
      if (error.request) {
        console.error("Could not connect to the Hue bridge");
        res.status(403).send("Could not connect to the Hue bridge");
      }
    });

  res.send(JSON.stringify(output));
});

module.exports = router;
