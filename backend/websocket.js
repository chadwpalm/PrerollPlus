const WebSocket = require("ws");

const LOG_TAG = "[WEBSOCKET]";

let wss;
let clientCounter = 0;

function initializeWebSocket(server) {
  wss = new WebSocket.Server({ server });

  console.info(`${LOG_TAG} WebSocket server initialized on server`);

  wss.on("connection", (ws, req) => {
    clientCounter++;
    const clientId = clientCounter;
    const clientIp = req?.socket?.remoteAddress || "unknown";

    console.info(`${LOG_TAG} Client connected - ID:${clientId} IP:${clientIp} (total clients: ${wss.clients.size})`);

    ws.on("message", (message) => {
      console.debug(`${LOG_TAG} Received message from client ID:${clientId} (${clientIp}): ${message}`);
    });

    ws.on("close", (code, reason) => {
      console.info(
        `${LOG_TAG} Client disconnected - ID:${clientId} IP:${clientIp} (code:${code}, reason:${reason || "none"}) (remaining clients: ${wss.clients.size})`,
      );
    });

    ws.on("error", (error) => {
      console.error(`${LOG_TAG} WebSocket error for client ID:${clientId} (${clientIp}): ${error.message}`);
    });
  });

  wss.on("error", (error) => {
    console.error(`${LOG_TAG} WebSocket server error: ${error.message}`);
  });

  return wss;
}

function broadcastUpdate() {
  if (!wss || !wss.clients) {
    console.warn(`${LOG_TAG} No WebSocket server or clients available - update broadcast skipped`);
    return;
  }

  const clientCount = wss.clients.size;
  if (clientCount === 0) {
    console.debug(`${LOG_TAG} Broadcast update: no clients connected`);
    return;
  }

  console.info(`${LOG_TAG} Broadcasting update to ${clientCount} client(s)`);

  let sentCount = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send("update-config");
      sentCount++;
    } else {
      console.debug(`${LOG_TAG} Skipped closed client during broadcast`);
    }
  });

  console.debug(`${LOG_TAG} Update broadcast complete - sent to ${sentCount}/${clientCount} clients`);
}

module.exports = { initializeWebSocket, broadcastUpdate };
