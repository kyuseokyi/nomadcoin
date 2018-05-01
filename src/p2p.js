const Websockets = require("ws");
const Blockchain = require("./blockchain");

const { getNewestBlock, addBlockToChain, isBlockStructureValid, replaceChain, getBlockchain  } = Blockchain;

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
  sendMessage(ws, responseLatest());
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
      case GET_LATEST: //마지막 블럭을 요청한다.
        console.log("message Type : ")
        sendMessage(ws, responseLatest());
        break;
      case GET_ALL: //불럭체인을 요청한다.
        sendMessage(ws, responseAll());
        break;
      case BLOCKCHAIN_RESPONSE: //블럭체인을 받았을경우.
        const receivedBlocks = message.data;
        if (receivedBlocks === null) {
          break;
        }
        handleBlockchainResponse(receivedBlocks);
        break;
    }
  });
};

//respnose data가 블럭일경의 핸들러.
//@param receviedBlocks 블럭배열
const handleBlockchainResponse = receivedBlocks => {
  if (receivedBlocks.length === 0) {
    console.log("Received blocks hava a length of 0");
    return;
  }

  //전달받은 블럭을 검증한다.
  const latestBlockReceived = receivedBlocks[receivedBlocks.length-1];
  //구조상 이상이 없으면 계속 진행.
  if (!isBlockStructureValid(latestBlockReceived)) {
    console.log("The blocks structure of the block received is not valid");
    return;
  }

  const newestBlock = getNewestBlock();

  if (latestBlockReceived.index > newestBlock.index) {
    //다른 서버의 블럭이 내가 가지고 있는 마지막 블러보다 앞서있다는 의미
    //두 블럭사이에 길이의 차이를 구한다.
    if (newestBlock.hash === latestBlockReceived.previousHash) {
      //새로 받은 블럭의 이전불럭과 현재 가지고 있는 최신 불럭이 같다면 새로받은 불럭은 내 블럭체인에 추가해야한다.
      //클라이언트가 가진 블럭의과의 차이가 한개 뿐이라면 추가해준다.
      if (addBlockToChain(latestBlockReceived)) {
        //블럭이 성공적으로 추가되었다면 모든 노드에게 추가된 불럭을 전달한다.
        broadcastNewBlock();
      };
    } else if (receivedBlocks.length === 1) {
      //To do , get all blocks,
      //클라이언트가 가진 블러과의 차이 많다면 (배열의 길이의 차이가 심하다면 전체를 교채한다. )
      //모든 peer에게 블럭체인을 요청한다.
      sendMessageToAll(getAll());
    } else {
      replaceChain(receivedBlocks);
    }
    console.log("")
  }
}

//들어온 요청에 메세지를 보낸다.
const sendMessage = (ws, message) => ws.send(JSON.stringify(message));

//모든 peer에 메세지를 보낸다.
const sendMessageToAll = message => sockets.forEach(ws => sendMessage(ws, message))

//마지막 블럭을 보내준다.
const responseLatest = () => blockchainResponse([getNewestBlock()]);

//모든 블럭을 보내준다.
const responseAll = () => blockchainResponse(getBlockschain);

//모든 노드에게 새로운 블럭이 생성되었음을 알린다.
const broadcastNewBlock = () => sendMessageToAll(responseLatest());


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
  connectToPeers,
  broadcastNewBlock
}