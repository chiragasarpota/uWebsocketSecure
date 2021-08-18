const WebSocket = require("ws");
const url = "ws://localhost:9001";

for (let i = 0; i < 10000; i++) {
  const connection = new WebSocket(url);
  connection.onopen = () => {};
}

async function sleep() {
  await new Promise((resolve) => setTimeout(resolve, 3600000));
}

sleep();
