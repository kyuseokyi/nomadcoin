const CryptoJS = require('crypto-js');
const hexToBinary = require('hex-to-binary');

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
    1524476950966,
    "This block is genesis block",
    0,
    0
);

//genesisblock을 이용하영 blockchain을 만든다. Block Type의 배열이다.
//블럭체인의 시작이다.
let blockChain = [genesisBlock];

const getNewestBlock = () => blockChain[blockChain.length - 1];

// // getLastBlock 다른 표현
// function getLastBlock() {
//   return blockChain[blockChain.length - 1];
// }

//생성시간을 가져옴.
const getNewTimestamp = () => new Date().getTime() / 1000;

//블럭체인은 가져옴.
const getBlockchain = () => blockChain;

//data를 받아 sha256 해쉬를 만들어준다.
const createHash = (index, previoushash, timestamp, data, difficulty, nonce) =>
    CryptoJS.SHA256(index + previoushash + timestamp + JSON.stringify(data) + difficulty + nonce).toString();

const createNewBlock = data => {
  const previousBlock = getNewestBlock();
  const newBlockIndex = previousBlock.index +1;
  const newTimestamp = getNewTimestamp();
  const newBlock = findBlock (
      newBlockIndex,
      previousBlock.hash,
      newTimestamp,
      data,
      5
  );

  addBlockToChain(newBlock);
  require('./p2p').broadcastNewBlock();
  return newBlock;
};

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
const getBlockHash = (block) => createHash(block.index, block.previousHash, block.timestamp, block.data);

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

//블럭및 체인의 검증이 완료되면 새로운 블럭체인으로 교체한다.
//블럭검증 -> genesis 블럭 검증, 유효성 검증 -> 체인 길이확인. -> 교체
const replaceChain = newChain =>{
  if(isChaindValid(newChain) && newChain.length > getBlockchain().length) {
    blockChain = newChain;
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

module.exports = {
  getBlockchain,
  createNewBlock,
  getNewestBlock,
  isBlockValid,
  isBlockStructureValid,
  addBlockToChain,
  replaceChain
}