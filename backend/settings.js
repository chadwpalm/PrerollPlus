var express = require("express");
var router = express.Router();
var axios = require("axios").default;
const https = require("https");
var parser = require("xml-js");

const LOG_TAG = "[SETTINGS]";

router.post("/", async function (req, res, next) {
  var serverList = [];
  var finalList = [];
  var unauth = false;

  const token = req.body.token;
  const plexApiUrl = "https://plex.tv/api/servers";

  try {
    console.info(`${LOG_TAG} Retrieving Plex Servers`);
    const response = await axios.get(plexApiUrl, { timeout: 10000, params: { "X-Plex-Token": token } });
    const servers = parser.xml2js(response.data, { compact: true, spaces: 4 }).MediaContainer.Server;

    if (Array.isArray(servers)) {
      serverList = servers;
    } else if (!servers) {
      serverList = [];
    } else {
      serverList.push(servers);
    }

    console.log(`${LOG_TAG} Found ${serverList.length} Plex server${serverList.length > 1 ? "s" : ""}`);

    for (let i = 0; i < serverList.length; i++) {
      console.debug(`${LOG_TAG} Server ${i + 1} info:`);
      console.debug(`${LOG_TAG} Name: ${serverList[i]._attributes.name}`);
      console.debug(`${LOG_TAG} Owned: ${serverList[i]._attributes.owned ? "Yes" : "No"}`);
      console.debug(`${LOG_TAG} External Address: ${serverList[i]._attributes.address}`);
      console.debug(`${LOG_TAG} External Port: ${serverList[i]._attributes.port}`);
      console.debug(`${LOG_TAG} Local Address: ${serverList[i]._attributes.localAddresses}`);
      console.debug(`${LOG_TAG} Local Port: 32400`);
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      unauth = true;
    }
    console.error(`${LOG_TAG} Issue with connection to online Plex account while requesting servers: ${error.message}`);
  }

  for (const element of serverList) {
    if (element._attributes.owned === "1") {
      const localAddresses = element._attributes.localAddresses.split(",");

      for (const localIP of localAddresses) {
        const localUrl = `http://${localIP.trim()}:32400/:/prefs`;
        console.debug(`${LOG_TAG} Retrieving Cert from URL: ${localUrl}`);

        try {
          const response = await axios.get(localUrl, { timeout: 3000, params: { "X-Plex-Token": token } });

          let certId = response.data.MediaContainer.Setting.find((id) => id.id === "CertificateUUID");

          finalList.push({
            name: element._attributes.name,
            localIP: localIP.trim(),
            remoteIP: element._attributes.address,
            port: element._attributes.port,
            cert: certId ? certId.value : null,
            certSuccessful: certId !== undefined,
            https: false,
          });
        } catch (error) {
          console.info(`${LOG_TAG} Could not make insecure connection to Plex Server at ${localIP}`);
          console.info(`${LOG_TAG} Attempting secure connection`);
          // Check with secure connection
          const localUrl = `https://${localIP.trim()}:32400/:/prefs`;
          try {
            const agent = new https.Agent({
              rejectUnauthorized: false,
            });

            const response = await axios.get(localUrl, {
              timeout: 3000,
              params: { "X-Plex-Token": token },
              httpsAgent: agent,
            });

            let certId = response.data.MediaContainer.Setting.find((id) => id.id === "CertificateUUID");

            finalList.push({
              name: element._attributes.name,
              localIP: localIP.trim(),
              remoteIP: element._attributes.address,
              port: element._attributes.port,
              cert: certId ? certId.value : null, // Only include cert if it exists
              certSuccessful: certId !== undefined, // Flag indicating whether cert was found or not
              https: true,
            });
          } catch (error) {
            console.error(`${LOG_TAG} Issue with secure connection to Plex Server at ${localIP}: ${error.message}`);
          }

          finalList.push({
            name: element._attributes.name,
            localIP: localIP.trim(),
            remoteIP: element._attributes.address,
            port: element._attributes.port,
            cert: null,
            certSuccessful: false,
            https: false,
          });
        }
      }
    }
  }
  console.debug(`${LOG_TAG} Final List: ${JSON.stringify(finalList)}`);
  res.send(JSON.stringify(finalList));
});

module.exports = router;
