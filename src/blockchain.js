const CryptoJS = require('crypto-js');
const hexToBinary = require('hex-to-binary');
const Wallet = require('./wallet');

//코인의 잔고를 확인하기 위해서 wallet balance
const { getBalance, getPrivateKeyFromWallet } = Wallet;

//몇분마다 블럭이 체굴될것인지.
const BLOCK_GENERATION_INTERVAL = 10;

//난이드 증가 블럭 범위.10번째블럭마다 난이드를 중가시킨다. 비트코인의 경우 2016번째 마다 난이도가 증가한다.
const DIFFICULTY_ADJUSMENT_INTERVAL = 10;


class Block {
  //포인트는  이전 해쉬 코드를가지고 새로운 해쉬를 만드는 것이 블럭체인 의 핵심이다.
  constructor(index, hash, previousHash, timestamp, data, difficulty, nonce) {
    this.index = index;
    this.hash = hash;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data;
    this.difficulty = difficulty;
    this.nonce = nonce;
  }
}

//init genesis block
//sha256을 이용하여 해쉬를 생성
//아래의 input 값을 가지고 만들어진 해쉬
// 4B97A3F47AC5A636EA4077117A03BF4A4EF89D56BA9B70D1CA3BEBE89A31694E
const genesisBlock = new Block(
    0,
    "4B97A3F47AC5A636EA4077117A03BF4A4EF89D56BA9B70D1CA3BEBE89A31694E",
    null,
    1525287195,
    "This block is genesis block",
    0,
    0
);

//genesisblock을 이용하영 blockchain을 만든다. Block Type의 배열이다.
//블럭체인의 시작이다.
let blockChain = [genesisBlock];
//사용안된 transaction data class
//사용하지 않은 아웃풋 이전 트랜잭션에서.
//거래가 발생되면 사용되지 않은 트랜잭션 사용 내역을 가지고 거래를 시작한다.
//현재 보유중인 코인(블럭체인)및 거래 내역이다. 입출금등 거래가 발생후 최종적으로 업데이트 해야한다.
//거래의 시작이자 마지막이다.
//내 블럭체인(코인내역이다.) 내가 소유한. 거래가 발생하여 블럭으 받거나 사용했다면 추가및 삭제해야한다.
let uTxOuts = [];

const getNewestBlock = () => blockChain[blockChain.length - 1];

// // getLastBlock 다른 표현
// function getLastBlock() {
//   return blockChain[blockChain.length - 1];
// }

//생성시간을 가져옴.
//1단계. 보안을 위하여 round 처리.
//2단계. 유효성을 검증해야함.
const getNewTimestamp = () => Math.round(new Date().getTime() / 1000);

//블럭체인은 가져옴.
const getBlockchain = () => blockChain;

//data를 받아 sha256 해쉬를 만들어준다.
const createHash = (index, previoushash, timestamp, data, difficulty, nonce) =>
    CryptoJS.SHA256(index + previoushash + timestamp + JSON.stringify(data) + difficulty + nonce).toString();

const createNewBlock = data => {
  const previousBlock = getNewestBlock();
  const newBlockIndex = previousBlock.index +1;
  const newTimestamp = getNewTimestamp();
  const difficulty = findDifficulty();
  const newBlock = findBlock (
      newBlockIndex,
      previousBlock.hash,
      newTimestamp,
      data,
      difficulty
  );

  addBlockToChain(newBlock);
  require('./p2p').broadcastNewBlock();
  return newBlock;
};

//난이도를 가저온다.
const findDifficulty = () => {
  const newestBlock = getNewestBlock();
  if (newestBlock.index % DIFFICULTY_ADJUSMENT_INTERVAL === 0 && newestBlock.index !== 0) {
    //todo calculate new difficulty
    return calculateNewDifficult(newestBlock, getBlockchain());
  } else {
    return newestBlock.difficulty;
  }
}

//새로운 난이도를 계산한다.
const calculateNewDifficult = (newestBlock, blockchain) => {
  const lastCalculateDifficult = blockchain[blockchain.length - DIFFICULTY_ADJUSMENT_INTERVAL];
  const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSMENT_INTERVAL;
  const timeTaken = newestBlock.timestamp - lastCalculateDifficult.timestamp;
  if (timeTaken < timeExpected / 2) {
    //체굴시간이 너무 짧다면 난이도 증가.
    return lastCalculateDifficult.difficulty + 1;
  } else if (timeTaken > timeExpected * 2) {
    //채굴시간이 너무 길다면 난이도 감소
    return lastCalculateDifficult.difficulty - 1;
  } else {
    //채굴시간이 적당하다면 수정하지 않는다.
    return lastCalculateDifficult.difficulty;
  }
}

//블
const findBlock  = (index, previousHash, timestamp, data, difficulty) => {
  let nonce = 0;
  while (true) {
    console.log('current nonce: ', nonce);
    const hash = createHash(
      index,
      previousHash,
      timestamp,
      data,
      difficulty,
      nonce
    );
    //todo check amount of zeros(hashmatchesdifficulty)
    if (hashMatchesDifficulty(hash, difficulty)) {
      return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
    }
    nonce++;
  }
}

//hash의 난이도를 찾아낸다.
const hashMatchesDifficulty = (hash, difficulty) => {
  const hexInBinary = hexToBinary(hash);
  const requiredZeros = "0".repeat(difficulty);
  console.log('Trying difficulty :', difficulty, 'with hash', hash);
  return hexInBinary.startsWith(requiredZeros);
}

//블럭 해시를 생성해서 가져온다.
const getBlockHash = (block) => createHash(block.index, block.previousHash, block.timestamp, block.data, block.difficulty, block.nonce);

//타임스탬프 유효성 검증.
//새로 생성된 블럭의 생성시간이 현재 시간을 기준으로 유효한 범위 안에 들어 있는지를 확인해야한다.
//블럭이 생성된가 함게 유효성 검증을 하게 됨으로 특정범위 밖으로 나가게된다면 유효성에 문제가 있는것이다.
const isTimeStampValid = (newBlock, oldBlock) => {
  return (
      oldBlock.timestamp - 60 < newBlock.timestamp &&
      newBlock.timestamp - 60 < getNewTimestamp());
}

// 새로 생성된 블럭 검증.
// @param candidateBlock 후보불럭 새로 생선예정 블럭
// @param lastestBlock 마지막으로 생성된 블럭.
const isBlockValid = (candidateBlock, lastestBlock) => {
  if (!isBlockStructureValid(candidateBlock)) {
    //새로 추가될 블럭의 구조를 검증한다.
    console.log('The candidate block structure is not valid');
    return false;
  } else if (lastestBlock.index + 1 != candidateBlock.index) {
    //check index
    console.log('The candidateBlock doesnt have valid index');
    return false;
  } else if (lastestBlock.hash !== candidateBlock.previousHash) {
    //
    console.log('The previousBlock of candidate block is not the hash of the latest block');
    return false;
  } else if (getBlockHash(candidateBlock) !== candidateBlock.hash) {
    // 후보블럭 해쉬 검증.
    console.log('The hash of this block is invalid');
    return false;
  } else if (!isTimeStampValid(candidateBlock, lastestBlock)) {
    console.log('The timestamp of thi block is dodgy');
    return false;
  }
  return true;
}

// 새로운 블럭의 구조를 검증한다.
const isBlockStructureValid = (block) => {
    //블럭내 type을 검증한다.
    return (
        typeof block.index === 'number' &&
        typeof block.hash === 'string' &&
        typeof block.previousHash === 'string' &&
        typeof block.timestamp === 'number' &&
        typeof block.data === 'string'
    )
}

//블럭체인을 검증한다.
//중요 - 모든 블럭은 하나의 genesis 시작된 불럭이어야한다.
//블럭체인 배열의 첫번재 불럭은 genesis 블럭이어야 한다. 불변. 무조건. 핵심이다. 가장 중요.
const isChaindValid = (candidateBlock) => {
  //블럭체인(배열)
  const isGenesisValid = (block) => {
    return JSON.stringify(block) === JSON.stringify(genesisBlock)
  }
  //후보 체인이 genesisBlock으로 부터 만들어 졌는지를 확인한다.
  if (!isGenesisValid(candidateBlock[0])) {
    console.log("The candidateChain's genesis block is not same as our genesis block");
    return false;
  }

  //블럭체인을 검증할때에는 이전 해쉬값을 검증해야한다. 하지만 genesisBlock은 첫번째 블럭으로 이전 블럭해쉬를 가지고 있지 않음으로 검증에서 제외한다.
  //체크는 2번째 블럭부터 첫번째는 제네시스 블럭이기 때문이다.
  for (let i = 1; i < candidateBlock.length; i++) {
    if (!isBlockValid(candidateBlock[i], candidateBlock[i - 1])) {
      console.log('');
      return false;
    }
    return true;
  }
}

//함수형 programming
//함수를 사용하여 축약한다.
//블럭체인의 난이도를 합산하여 리턴한다.
const sumDifficulty = anyBlockchain =>
  anyBlockchain
  .map(block => block.difficulty) //블럭배열의 난이도를 배열화함.
  .map(difficulty => Math.pow(2, difficulty)) //각각의 난이도에 2를 곱함.
  .reduce((a, b) => a + b); //각 배열을 합하여 리턴.



//블럭및 체인의 검증이 완료되면 새로운 블럭체인으로 교체한다.
//블럭검증 -> genesis 블럭 검증, 유효성 검증 -> 체인 길이확인. -> 교체
const replaceChain = candidateChain =>{
  //if(isChaindValid(newChain) && newChain.length > getBlockchain().length) { // 체인의 배열 길이가 더 길때에만 교환했다.
  if(isChaindValid(candidateChain) && sumDifficulty(candidateChain) > sumDifficulty(getBlockchain())) { //난이도가 더 높은 체인일때에 교채한다. 
    blockChain = candidateChain;
    return true;
  } else {
    //체인 길이가 짧거나 같다면 블럭 채굴 실패.
    return false;
  }
}

//블럭 검증 완료되면 기존블럭체인에 새로운 블럭을 추가한다.
//genesis블럭및 구조검증은 완료된 상태이다.
const addBlockToChain = candidateBlock => {
  if(isBlockValid(candidateBlock, getNewestBlock())) {
    console.log('block add true');
    getBlockchain().push(candidateBlock);
    return true;
  } else {
    console.log('block add fail');
    return false;
  }
}

const getAccountBalance = () => getBalance(getPrivateKeyFromWallet(), uTxOuts);

module.exports = {
  getBlockchain,
  createNewBlock,
  getNewestBlock,
  isBlockValid,
  isBlockStructureValid,
  addBlockToChain,
  replaceChain,
  getAccountBalance
}