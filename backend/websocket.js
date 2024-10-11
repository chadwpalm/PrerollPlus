const WebSocket = require("ws");

let wss;

function initializeWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("Client connected");
    ws.on("message", (message) => {
      console.log("Received message from client:", message);
    });
  });

  return wss;
}

function broadcastUpdate() {
  console.info("Sending update");
  if (wss && wss.clients) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send("update-config");
      }
    });
  } else {
    console.error("Could not send update");
  }
}

module.exports = { initializeWebSocket, broadcastUpdate };
