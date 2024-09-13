var express = require("express");
var router = express.Router();
var axios = require("axios").default;
var parser = require("xml-js");

router.post("/", async function (req, res, next) {
  var serverList = [];
  var finalList = [];
  var unauth = false;

  const token = req.body.token;
  const plexApiUrl = "https://plex.tv/api/servers";

  try {
    console.info("Retrieving Plex Servers");
    const response = await axios.get(plexApiUrl, { timeout: 10000, params: { "X-Plex-Token": token } });
    const servers = parser.xml2js(response.data, { compact: true, spaces: 4 }).MediaContainer.Server;

    if (Array.isArray(servers)) {
      serverList = servers;
    } else if (!servers) {
      serverList = [];
    } else {
      serverList.push(servers);
    }

    console.debug("Found", serverList.length, "Plex servers");

    for (let i = 0; i < serverList.length; i++) {
      console.debug(`Server ${i + 1} info:`);
      console.debug("Name:", serverList[i]._attributes.name);
      console.debug("Owned:", serverList[i]._attributes.owned);
      console.debug("External Address:", serverList[i]._attributes.address);
      console.debug("External Port:", serverList[i]._attributes.port);
      console.debug("Local Address:", serverList[i]._attributes.localAddresses);
      console.debug("Local Port: 32400");
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      unauth = true;
    }
    console.error("Issue with connection to online Plex account while requesting servers:", error.message);
  }

  for (const element of serverList) {
    if (element._attributes.owned === "1") {
      const localAddresses = element._attributes.localAddresses.split(","); // Split multiple local addresses by commas

      for (const localIP of localAddresses) {
        const localUrl = `http://${localIP.trim()}:32400/:/prefs`; // Trim whitespace and form the URL
        console.debug("Retrieving Cert from URL:", localUrl);

        try {
          const response = await axios.get(localUrl, { timeout: 500, params: { "X-Plex-Token": token } });

          let certId = response.data.MediaContainer.Setting.find((id) => id.id === "CertificateUUID");

          // Push the server info, marking certSuccessful as true if the cert is found
          finalList.push({
            name: element._attributes.name,
            localIP: localIP.trim(),
            remoteIP: element._attributes.address,
            port: element._attributes.port,
            cert: certId ? certId.value : null, // Only include cert if it exists
            certSuccessful: certId !== undefined, // Flag indicating whether cert was found or not
          });
        } catch (error) {
          // On failure, still push the server info but set certSuccessful to false
          finalList.push({
            name: element._attributes.name,
            localIP: localIP.trim(),
            remoteIP: element._attributes.address,
            port: element._attributes.port,
            cert: null, // No cert available on failure
            certSuccessful: false, // Mark the cert as unsuccessful
          });

          console.error(`Issue with connection to Plex Server at ${localIP}:`, error.message);
        }
      }
    }
  }

  res.send(JSON.stringify(finalList));
});

module.exports = router;
