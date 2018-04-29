const Websockets = require("ws");
const Blockchain = require("./blockchain");

//연결된 소켓 목록.
const sockets = [];

//Message Response
const GET_LATEST = "GET_LATEST";
const GET_ALL = "GET_ALL";
const BLOCKCHAIN_RESPONSE = "BLOCKCHAIN_RESPONSE";

//Message Creators
const getLatest = () => {
  return {
    type: GET_LATEST,
    data: null
  };
};

const getAll = () => {
  return {
    type: GET_ALL,
    data: null

  };
};

const blockchainResponse = (data) => {
  return {
    type: BLOCKCHAIN_RESPONSE,
    data
  };
};


//소켓 목록을 가져온다.
const getSockets = () => sockets;
//블럭체인을 가져온다.
const { getBlockschain, getLastBlock } = Blockchain;


const startP2PServer = server => {
  const wsServer = new Websockets.Server({ server });
  wsServer.on('connection', ws => {
    //소켓 커넥션 이벤트 정의.
    initSocketConnection(ws);
  });
  console.log('p2p servers is running!!');
}

//소켓 초기화 핸들러.
const initSocketConnection = ws => {
  sockets.push(ws);
  // 소켓 메세지 핸들러 추가.
  handleSocketMessages(ws);
  //소켓 오류및 종료 핸들러추가.
  handleSocketError(ws);
  //접속한 대상에게 체인의 마지막 블럭을 전달한다.
  //이블럭을 통행 접속한 대상의 불럭체인 상태를 점검한다. 동일한 체인인지. 서로 다른 체인의 사이즈를 가지고 있는지확인다.
  sendMessage(ws, getLastBlock());
  console.log('finish initsocketconnection');
}

//소켓 메세지에 들어오는(input) data 파싱.
const parseData = data => {
  try {
    return JSON.parse(data);
  } catch(e) {
    console.log(e);
    return null;
  }
}

//소켓 메세지 핸들러 정의
const handleSocketMessages = ws => {
  // "message" 이벤트 핸들러.
  ws.on("message", data => {
    const message = parseData(data);
    if (data === null) {
      return; 
    } 
    console.log(data);
    switch (message.type) {
      case GET_LATEST:
        console.log("message Type : ")
        sendMessage(ws, getLastBlock());
        break;
      case GET_ALL:
        sendMessage(ws, getAll());
        break;
      case BLOCKCHAIN_RESPONSE:

        break;
    }
  });
};

const sendMessage = (ws, message) => ws.send(JSON.stringify(message));

//소켓 에러 핸들러 정의
const handleSocketError = ws => {
  //소켓 에러가 발생시 socket을 종료하고 socket 목록에서 socket을 삭제한다.
  const closeSocketConnection = ws => {
    ws.close();
    sockets.splice(sockets.indexOf(ws),1);
  }

  ws.on('close', () => closeSocketConnection(ws));
  ws.on('error', () => closeSocketConnection(ws));
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