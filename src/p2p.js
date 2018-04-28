const Websockets = require("ws");

const sockets = [];

const getSockets = () => sockets;

const startP2PServer = server => {
  const wsServer = new Websockets.Server({ server });
  wsServer.on('connection', ws => {
    console.log('Hello %s', ws);
  });
  console.log('p2p servers is running!!');
}

const initSocketConnection = socket => {
  sockets.push(socket);
}

//peer(소켓서버)에 접속한다.
//@param newPeer socket url
const connectToPeers = newPeer => {
  const ws = new Websockets(newPeer);
  //소켓 이벤트 리스너 등록.
  ws.on("open", () => {
    initSocketConnection(ws);
  });
}

module.exports = {
  startP2PServer,
  connectToPeers
}