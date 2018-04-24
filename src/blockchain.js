const CryptoJS = require('crypto-js');

class Block {
  //포인트는  이전 해쉬 코드를가지고 새로운 해쉬를 만드는 것이 블럭체인 의 핵심이다.
  constructor(index, hash, previousHash, timestamp, data) {
    this.index = index;
    this.hash = hash;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data;
  }
}

//init genesis block
//sha256을 이용하여 해쉬를 생성
//아래의 input 값을 가지고 만들어진 해쉬
// 4B97A3F47AC5A636EA4077117A03BF4A4EF89D56BA9B70D1CA3BEBE89A31694E
const genesisBlock = new Block(
    0,
    '4B97A3F47AC5A636EA4077117A03BF4A4EF89D56BA9B70D1CA3BEBE89A31694E',
    null,
    1524476950966,
    'This block is genesis block'
);

//genesisblock을 이용하영 blockchain을 만든다. Block Type의 배열이다.
//블럭체인의 시작이다.
let blockChain = [genesisBlock];

const getLastBlock = () => blockChain[blockChain.length - 1];

// // getLastBlock 다른 표현
// function getLastBlock() {
//   return blockChain[blockChain.length - 1];
// }

//생성시간을 가져옴.
const getNewTimestamp = () => new Date().getTime() / 1000;

//data를 받아 sha256 해쉬를 만들어준다.
const createHash = (index, hash, previousHash, data) =>
    CryptoJS.SHA256(index + hash + previousHash + data).toString();

const createNewBlock = data => {
  const previousBlock = getLastBlock();
  const newBlockIndex = previousBlock.index +1;
  const newTimestamp = getNewTimestamp();
  const newHash = createHash(
      newBlockIndex,
      previousBlock.hash,
      newTimestamp,
      data
  );
  const newBlock = new Block(
      newBlockIndex,
      newHash,
      previousBlock.hash,
      newTimestamp,
      data
  );

  return newBlock;
};

console.log(blockChain);