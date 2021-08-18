const uWS = require("uWebSockets.js");
// const decoder = new TextDecoder("utf-8");

const port = 9001;

const app = uWS
  .SSLApp()
  .ws("/*", {
    /* Options */
    key_file_name: '/etc/letsencrypt/live/ws.alloapp.io/privkey.pem',
    cert_file_name: '/etc/letsencrypt/live/ws.alloapp.io/fullchain.pem',
    compression: uWS.SHARED_COMPRESSOR,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 60,
    /* Handlers */
    open: (ws) => {
      /* Let this client listen to all sensor topics */
    },
    message: (ws, message, isBinary) => {
      var parsedMsg = JSON.parse(Buffer.from(message).toString());
      if (parsedMsg.action === "pub") {
        app.publish(parsedMsg.topic, parsedMsg.message);
      }
      if (parsedMsg.action === "sub") {
        ws.subscribe(parsedMsg.topic);
      }
    },
    drain: (ws) => {},
    close: (ws, code, message) => {
      /* The library guarantees proper unsubscription at close */
    },
  })
  .any("/*", (res, req) => {
    res.end("Nothing to see here!");
  })
  .listen(port, (token) => {
    if (token) {
      console.log("Listening to port " + port);
    } else {
      console.log("Failed to listen to port " + port);
    }
  });
