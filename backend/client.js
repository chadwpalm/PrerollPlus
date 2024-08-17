var express = require("express");
var router = express.Router();
var axios = require("axios").default;
var https = require("https");
var parser = require("xml-js");
var fs = require("fs");
var path = require("path");

router.post("/", async function (req, res, next) {
  var rooms = {};
  var zones = {};
  var scenes = [];
  var users = [];
  var data = [];
  var groupList = [];
  var message = [];

  var unauth = false;

  const httpsAgent = new https.Agent({
    rejectUnauthorized: false, // (NOTE: this will disable client verification)
    cert: fs.readFileSync(path.resolve(__dirname, "bridgecert.pem")),
  });

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

  var url = `https://${req.body.bridge.ip}/clip/v2/resource/scene`;

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
      console.info("Retrieving Light Scenes");
      var data = [];
      data = response.data.data;
      data.forEach((scene) => {
        try {
          rooms.forEach((room) => {
            if (room.id === scene.group.rid) {
              let array = `{ "Id":"${scene.id}", "Name":"${scene.metadata.name}", "Room":"${room.metadata.name}"}`;
              scenes.push(JSON.parse(array));
            }
          });
          zones.forEach((zone) => {
            if (zone.id === scene.group.rid) {
              let array = `{ "Id":"${scene.id}", "Name":"${scene.metadata.name}", "Room":"${zone.metadata.name}"}`;
              scenes.push(JSON.parse(array));
            }
          });
        } catch (error) {
          console.error("Scenes: ", error);
        }
      });
      scenes.sort((a, b) => (a.Name > b.Name ? 1 : b.Name > a.Name ? -1 : 0));
      scenes.sort((a, b) => (a.Room > b.Room ? 1 : b.Room > a.Room ? -1 : 0));
    })
    .catch(function (error) {
      console.error("Error while trying to connect to the Hue bridge while requesting scenes: ", error.message);
      message.push("Could not connect to the Hue bridge while requesting scenes");
    });

  var url = `https://${req.body.bridge.ip}/clip/v2/resource/smart_scene`;

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
      console.info("Retrieving Smart Scenes");
      var data = [];
      data = response.data.data;
      data.forEach((scene) => {
        try {
          rooms.forEach((room) => {
            if (room.id === scene.group.rid) {
              let array = `{ "Id":"${scene.id}", "Name":"${scene.metadata.name}", "Room":"${room.metadata.name}"}`;
              scenes.push(JSON.parse(array));
            }
          });
          zones.forEach((zone) => {
            if (zone.id === scene.group.rid) {
              let array = `{ "Id":"${scene.id}", "Name":"${scene.metadata.name}", "Room":"${zone.metadata.name}"}`;
              scenes.push(JSON.parse(array));
            }
          });
        } catch (error) {
          console.error("Scenes: ", error);
        }
      });
      scenes.sort((a, b) => (a.Name > b.Name ? 1 : b.Name > a.Name ? -1 : 0));
      scenes.sort((a, b) => (a.Room > b.Room ? 1 : b.Room > a.Room ? -1 : 0));
    })
    .catch(function (error) {
      console.error("Error while trying to connect to the Hue bridge while requesting smart scenes: ", error.message);
      message.push("Could not connect to the Hue bridge while requesting smart scenes");
    });

  var url = "https://plex.tv/api/users";

  await axios
    .get(url, { timeout: 10000, params: { "X-Plex-Token": req.body.token } })

    .then(function (response) {
      console.info("Retrieving Plex Accounts");

      var user = parser.xml2js(response.data, { compact: true, spaces: 4 }).MediaContainer.User;

      if (Array.isArray(user)) {
        users = user;
      } else if (!user || user === undefined) {
        users = [];
      } else {
        users.push(user);
      }
    })
    .catch(function (error) {
      if (error.response.status === 401) {
        unauth = true;
      }
      console.error("Issue with connection to online Plex account while requesting friends: ", error.message);
      message.push("Issue with connection to online Plex account while requesting friends. Check logs for reason.");
    });

  var url = "https://plex.tv/users/account";

  await axios
    .get(url, { timeout: 10000, params: { "X-Plex-Token": req.body.token } })

    .then(function (response) {
      console.info("Retrieving Server Admin Information");

      let user = parser.xml2js(response.data, { compact: true, spaces: 4 }).user;

      let temp = {
        _attributes: { id: user._attributes.id, title: user._attributes.title, username: user._attributes.username },
      };

      users.push(temp);
      users.sort((a, b) =>
        a._attributes.title > b._attributes.title ? 1 : b._attributes.title > a._attributes.title ? -1 : 0
      );
    })
    .catch(function (error) {
      console.error("Issue with connection to online Plex account while requesting account info: ", error.message);
      message.push(
        "Issue with connection to online Plex account while requesting account info. Check logs for reason."
      );
    });

  var url = "https://plex.tv/devices.xml";

  await axios
    .get(url, { timeout: 10000, params: { "X-Plex-Token": req.body.token } })

    .then(function (response) {
      console.info("Retrieving Plex Clients");

      let list = parser.xml2js(response.data, { compact: true, spaces: 4 }).MediaContainer.Device;

      list.sort((a, b) => (a.lastSeenAt < b.lastSeenAt ? 1 : b.lastSeenAt < a.lastSeenAt ? -1 : 0));
      var i = 0;
      while (i < list.length) {
        if (list[i].name === "") {
          list.splice(i, 1);
        } else {
          ++i;
        }
      }
      data.push(users);
      data.push(list);
      data.push(scenes);
      data.push(groupList);
    })
    .catch(function (error) {
      console.error("Issue with connection to online Plex account while requesting device info: ", error.message);
      message.push("Issue with connection to online Plex account while requesting device info. Check logs for reason.");
    });

  if (message.length !== 0) {
    if (unauth) {
      res.status(401).send(JSON.stringify([]));
    } else {
      res.status(403).send(JSON.stringify(message));
    }
  } else {
    res.send(JSON.stringify(data));
  }
});

module.exports = router;
