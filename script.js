var peerConnection = null;
var localStream = null;
var localVideo = document.querySelector("#localVideo");
var remoteVideo = document.querySelector("#remoteVideo");

var remoteStream = null;
var roomId = null;
var selfId = Date.now().toString(36) + Math.random().toString(36).substr(2);

const configuration = {
  iceServers: [
    {
      urls: "stun:coturn.chiragasarpota.com:80",
    },
    {
      urls: "turn:coturn.chiragasarpota.com:80",
      credential: "coturn1998",
      username: "chirag",
    },
  ],
};

async function init() {
  // Generate random room name if needed
  if (!location.hash) {
    location.hash = Math.floor(Math.random() * 0xffffff).toString(16);
  }
  roomId = location.hash.substring(1);

  console.log("Create PeerConnection with configuration: ", configuration);
  peerConnection = new RTCPeerConnection(configuration);

  await openUserMedia();

  let ws = new WebSocket("ws://localhost:9001");
  ws.binaryType = "arraybuffer";

  ws.onmessage = async (message) => {
    let parsedMsg = JSON.parse(message.data);
    if (parsedMsg.type === "join" && parsedMsg.clientId !== selfId) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      ws.send(
        sendMessage({
          type: "data",
          clientId: selfId,
          message: JSON.stringify({ offer: offer }),
        })
      );
    } else if (parsedMsg.type === "data" && parsedMsg.clientId !== selfId) {
      message = JSON.parse(parsedMsg.message);
      if (message.answer) {
        const remoteDesc = new RTCSessionDescription(message.answer);
        await peerConnection.setRemoteDescription(remoteDesc);
      } else if (message.offer) {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(message.offer)
        );
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        ws.send(
          sendMessage({
            type: "data",
            clientId: selfId,
            message: JSON.stringify({ answer: answer }),
          })
        );
      } else if (message.iceCandidate) {
        try {
          await peerConnection.addIceCandidate(message.iceCandidate);
          console.log("Adding ice candidate");
        } catch (e) {
          console.error("Error adding received ice candidate", e);
        }
      }
    }
  };

  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        action: "sub",
        clientId: selfId,
        topic: roomId,
      })
    );
    ws.send(
      JSON.stringify({
        action: "pub",
        topic: roomId,
        message: JSON.stringify({ type: "join", clientId: selfId }),
      })
    );
  };

  registerPeerConnectionListeners();

  peerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      ws.send(
        sendMessage({
          type: "data",
          clientId: selfId,
          message: JSON.stringify({ iceCandidate: event.candidate }),
        })
      );
    }
  });

  peerConnection.addEventListener("track", async (event) => {
    remoteStream.addTrack(event.track, remoteStream);
  });

  // Listen for connectionstatechange on the local RTCPeerConnection
  peerConnection.addEventListener("connectionstatechange", (event) => {
    if (peerConnection.connectionState === "connected") {
      console.log("Peers Connected.");
    }
  });
}

async function openUserMedia(e) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  localVideo.srcObject = stream;
  localStream = stream;
  remoteStream = new MediaStream();
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });
  remoteVideo.srcObject = remoteStream;

  console.log("Stream:", document.querySelector("#localVideo").srcObject);
}

function registerPeerConnectionListeners() {
  peerConnection.addEventListener("icegatheringstatechange", () => {
    console.log(
      `ICE gathering state changed: ${peerConnection.iceGatheringState}`
    );
  });

  peerConnection.addEventListener("connectionstatechange", () => {
    console.log(`Connection state change: ${peerConnection.connectionState}`);
  });

  peerConnection.addEventListener("signalingstatechange", () => {
    console.log(`Signaling state change: ${peerConnection.signalingState}`);
  });

  peerConnection.addEventListener("iceconnectionstatechange ", () => {
    console.log(
      `ICE connection state change: ${peerConnection.iceConnectionState}`
    );
  });
}

function sendMessage(m) {
  return JSON.stringify({
    action: "pub",
    topic: roomId,
    message: JSON.stringify(m),
  });
}

function onSuccess() {}
function onError(error) {
  console.error(error);
}

init();
