// Docker HEALTHCHECK: request the app on its configured port and base URL.
// Silence config.js logging so health checks don't fill the container log.
console.info = () => {};

const http = require("http");
const { getInternalURL } = require("../backend/config");

http
  .get(getInternalURL("/"), { timeout: 4000 }, (res) => process.exit(res.statusCode === 200 ? 0 : 1))
  .on("timeout", () => process.exit(1))
  .on("error", () => process.exit(1));
