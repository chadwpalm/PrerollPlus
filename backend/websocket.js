const WebSocket = require("ws");
const log = require("./logger").tagged("WEBSOCKET");

let wss;
let clientCounter = 0;

function initializeWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    clientCounter++;
    const clientId = clientCounter;
    const clientIp = req?.socket?.remoteAddress || "unknown";

    log.debug(`Browser ${clientId} connected from ${clientIp} (${wss.clients.size} open)`);

    ws.on("message", (message) => {
      log.debug(`Message from browser ${clientId}: ${message}`);
    });

    ws.on("close", (code, reason) => {
      log.debug(`Browser ${clientId} disconnected (code ${code}, ${wss.clients.size} open)`);
    });

    ws.on("error", (error) => {
      log.warn(`Connection error with browser ${clientId} (${clientIp}):`, error.message);
    });
  });

  wss.on("error", (error) => {
    log.error("WebSocket server error:", error);
  });

  return wss;
}

function broadcastUpdate() {
  if (!wss || !wss.clients) {
    log.debug("No WebSocket server yet, skipped update notice");
    return;
  }

  const clientCount = wss.clients.size;
  if (clientCount === 0) {
    return;
  }

  let sentCount = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send("update-config");
      sentCount++;
    }
  });

  log.debug(`Told ${sentCount} open browser(s) to reload settings`);
}

module.exports = { initializeWebSocket, broadcastUpdate };
