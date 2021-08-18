var fs = require("fs");
var sizeof = require("object-sizeof");
var http = require("http");

var clientCount = 0;
var clientSize = 0;

//pass in your credentials to create an https server
var httpServer = http.createServer();
httpServer.listen(8080);

var WebSocketServer = require("ws").Server;
var wss = new WebSocketServer({
  server: httpServer,
});

class Message {
  constructor(type, data) {
    this.type = type;
    this.data = data;
  }
}

class Clients {
  constructor() {
    this.clientsList = {};
    this.saveClient = this.saveClient.bind(this);
  }
  saveClient(username, client) {
    this.clientsList[username] = client;
  }
}

const clients = new Clients();
var client_message = new Message("", "");
var parsedMsg = "";

function ws_send(type, data, client) {
  client_message.type = type;
  client_message.data = data;
  client.send(JSON.stringify(client_message));
}

wss.on("connection", (client) => {
  clientCount = clientCount + 1;
  clientSize = clientSize + sizeof(client);
  console.log("Connected Clients: " + clientCount + " Size: " + clientSize);
  client.on("message", (data) => {
    console.log("Client has sent: " + data);
    try {
      parsedMsg = JSON.parse(data);
    } catch (err) {
      console.log("Data Parsing Error: " + err);
      client.close();
    }
    if (parsedMsg.type === "username") {
      clients.saveClient(parsedMsg.data, client);
      console.log("Connected Clients: " + clients.clientsList.length);
    } else if (parsedMsg.type === "message") {
      if (parsedMsg.to_user in clients.clientsList) {
        ws_send(
          "message",
          parsedMsg.data,
          clients.clientsList[parsedMsg.to_user]
        );
      } else {
        ws_send("message", "Client is not online", client);
      }
    } else if (parsedMsg.type === "echo") {
      ws_send("echo", parsedMsg.data, client);
    }
  });

  client.on("close", (reasonCode, description) => {
    clientCount = clientCount - 1;
    clientSize = clientSize - sizeof(client);
    console.log(
      "Client has disconnected. Total count: " +
        clientCount +
        " Size: " +
        clientSize
    );
  });
  //ws_send("message", "Hi this is server WS new", client);
});
