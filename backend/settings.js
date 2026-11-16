var express = require("express");
var router = express.Router();
var axios = require("axios").default;
const https = require("https");
var parser = require("xml-js");
const store = require("./settingsStore");
const log = require("../backend/logger").tagged("PLEX");

router.post("/", async function (req, res, next) {
  var serverList = [];
  var finalList = [];

  // The saved Plex token (it is no longer sent to the browser)
  const token = store.read().token;
  const plexApiUrl = "https://plex.tv/api/servers";

  try {
    log.debug("Looking up Plex servers on the account");
    const response = await axios.get(plexApiUrl, { timeout: 10000, params: { "X-Plex-Token": token } });
    const servers = parser.xml2js(response.data, { compact: true, spaces: 4 }).MediaContainer.Server;

    if (Array.isArray(servers)) {
      serverList = servers;
    } else if (!servers) {
      serverList = [];
    } else {
      serverList.push(servers);
    }

    log.info(`Found ${serverList.length} Plex server${serverList.length === 1 ? "" : "s"} on the account`);

    for (const server of serverList) {
      const a = server._attributes;
      log.debug(
        `  "${a.name}" (${a.owned === "1" ? "owned" : "shared"}): remote ${a.address}:${a.port}, local ${a.localAddresses}:32400`,
      );
    }
  } catch (error) {
    log.error("Could not get the server list from plex.tv:", error);
  }

  for (const element of serverList) {
    if (element._attributes.owned === "1") {
      const localAddresses = element._attributes.localAddresses.split(",");

      for (const localIP of localAddresses) {
        const localUrl = `http://${localIP.trim()}:32400/:/prefs`;
        log.debug(`Checking ${localUrl}`);

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
          log.debug(`No plain HTTP connection to ${localIP} (${error.code || error.message}), trying HTTPS`);
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
            log.warn(`Could not connect to Plex server "${element._attributes.name}" at ${localIP}:`, error);
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
  log.debug(`Server choices: ${finalList.length}`);
  res.send(JSON.stringify(finalList));
});

module.exports = router;
