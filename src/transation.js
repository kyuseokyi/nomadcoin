// Tx === Transaction
const CryptoJs = require('crypto-js');
const Elliptic = require('elliptic');
const utils = require('./utils');

const ec = new Elliptic.ec('secp256k1');

//채굴시 얻게되는 코인의 갯수.
//비트코인의 경우 시간에 따라 코인베이스의 갯수가(반으로) 줄어들게 되어있음.
const COINBASE_AMOUNT = 50;

//내보내는 transaction data class
//출금 거래내역 data calss
class TxOut {
  constructor(address, amount) {
    this.address = address;
    this.amount = amount;
  }
}

//입금거래 data class
class TxIn {
  //txOutId
  //txOutIndex
  //Sigunature

}

//거래 내역 data 클랙스
//모든 거래내역을 가지고 있음(입출금 내역)
class Transaction {
  //ID 고유 id
  //txIns[] 입금내역 배열
  //txOuts[] 출금내역 배열
}

class UTxOut {
  constructor(txOutId, txOutIndex, address, amount) {
    this.txOutId = txOutId;
    this.txOutIndex = txOutIndex;
    this.address = address;
    this.amount = amount;
  }
}

//거래내역 id를 가져온다.
const getTxId = tx => {
  //transaction 정보를 취합하여 하나의 스트링으로 리턴
  const txInContent = tx.txIns
    .map(txIn => (txIn.uTxOutId + txIn.txOutIndex))
    .reduce((a, b) => a+b, "");
  const txOutContent = tx.txOuts
    .map(txOuts => (txOuts.address + txOuts.amount))
    .reduce((a, b) => a+b, "");

  return CryptoJs.SHA256(txInContent + txOutContent).toString();
}

const findUTxOut = (txOutId, txOutIndex, uTxOutList) => {
  return uTxOutList.find(uTxOut => uTxout.txOutId === txOutId && uTxout.txOutIndex === txOutIndex);
}

const signTxIn = (tx, txIndex, privateKey, uTxOutList) => {
  const txIn = tx.txIndex[txIndex];
  const dataToSign = tx.id;
  //todo Find transaction to input - 트랜잭션을 하기위해 넣어야 인풋값을 찾아야함 현재 값은 이전에 발생한 트랜잭션의 아웃풋이다.
  const referencedUTxOut = findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOutList);
  if (referencedUTxOut === null) {
    //해당 값이 널이라면 내가 사용할 coin이 없다는 의미.
    //코인을 보내기위해서 내가 보낼코인과 같거나 많은 코인을 보유 하고 있어야한다.
    console.log('Not enough coin');
    return;
  }

  const referencedAddress = referencedUTxOut.address;
  //todo: sign the txIn
  if (getPublicKey(privateKey) !== referencedAddress) {
    return false;
  }
  const key = ec.keyFromPrivate(privateKey, "hex");
  const signature = utils.toHexString(key.sign(dataToSign).toDER());
  return signature;
}

const getPublicKey = (privateKey) => {
  return ec
    .keyFromPrivate(privateKey, "hex")
    .getPublic()
    .encode("hex");
}

//새로운 거래내역을 가지고 업데이트한다.
//코인 돈 블럭의 이동 내역이다.
const updateUTxOuts = (newTxs, uTxOutList) => {
  const newUTxOuts = newTxs.map(tx => {
    tx.txOut.map((txOut, index) => {
      new UTxOut(tx.id, index, txOut.address, txOut.amount);
    });
  }).reduce((a, b) => a.concat(b), []); //기본값은 빈 배열이다.

  //
  const spentTxOuts = newTxs
    .map(tx => tx.txIns)
    .reduce((a, b) => a.concat(b), [])
    .map(txIn => new UTxOut(txIn.txOutId, "",0));

  //todo 이미사용된 UTxOutsList 업데이트 해야하다. 사용된 spentTxOuts를 삭제한다.
  const resultingUTxOuts = uTxOutList
    .filter(uTxOut => !findUTxOut(uTxOut.txOutId, uTxOut.txOutIndex, spentTxOuts))
    .concat(newUTxOuts);

  return resultingUTxOuts;
}

//transaction input structure valid
//입금거래 내역 구조 유효성을 검증한다.
const isTxInStructureValid = (txIn) => {
  //todo
  if (txIn === null) {
    return false;
  } else if (typeof txIn.signature !== "string") {

    return false;
  } else if (typeof txIn.txOutId !== "string") {

    return false;
  } else if (typeof txIn.txOutIndex !== "number") {

    return false;
  } else {
    return true;
  }
}

const isAddressValid = (address) => {
  if (address.length >= 300) {
    //주소가 300과 같거나 작으면 오류
    return false;
  } else if (address.match("^[a-fA-F0-9]+$") === null) {
    return false;
  } else if (!address.startsWith("04")) {
    return false;
  }
}

//transaction output structure valid
//출금거래 내역 구조 유효성을 검증한다.
const isTxOutStructureValid = (txOut) => {
  //todo
  if (txOut === null) {
    return false;
  } else if (typeof txOut.address !== "string") {
    return false;
  } else if (!isAddressValid(txOut.address)) {
    return false;
  } else if (typeof txOut.amount !== "number") {
    return false;
  } else {
    return true;
  }
}


//transaction valid
//거래 내역의 유효성을 검증한다.
const isTxStructureValid = (tx) => {
   if (typeof tx.id !== "string") {
     console.log('Tx ID is not valid');
     return false;
   } else if (!(tx.txIns instanceof Array)) {
     console.log('The txIns is not Array');
     return false;
   } else if (!tx.txIns.map(isTxInStructureValid).reduce((a, b) => a && b, true)) { //map은 txIn을 인자값으로 하는 isTxInStructureValid함수를 txIns array로 호출합니다.
      // map을 통하영 isTxInStructureValid 함수는 valid결과를 bool array를 전달하고 . reduce를 이용하여 모든 유형성 검증 결과가 true여야 통과한다.
     console.log("The structure of one of the txIn is not valid");
    return false;
   } else if (!(tx.txOuts instanceof Array)) {
     console.log('The txOuts is not Array');
     return false;
   } else if (!tx.txOuts.map(isTxOutStructureValid).reduce((a, b) => a && b, true)) {
     console.log("The structure of one of the txIn is not valid");
     return false;
   } else {
     cosoele.log("Tx is valid");
     return true;
   }
}

const validateTxIn = (txIn, tx, uTxOutList) => {
  const wantedTxOut = uTxOutList.find(uTxout => uTxout.txOutId === txIn.txOutId && uTxout.index === uTxIn.txOutIndex);
  if (wantedTxOut === null) {
    //사용할 코인이 없다는 의미.
    return false;
  } else {
    const address = wantedTxOut.address;
    const key = ec.keyFromPublic(address, "hex");
    return key.verify(address, txIn.signature);
  }
}

const getAmountTxIn= (txIn, uTxOutList) => findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOutList).amount;

const validateTx = (tx, uTxOutList) => {
  if (!isTxInStructureValid(tx)) {
    return false;
  }

  if (getTxId(tx) !== tx.id) {
    return false;
  }

  // tx가 유요한 tx를 가지고 있다면
  const hasValidTxIns = tx.txIns.map(txIn => validateTx(txIn, tx, uTxOutList ));

  if (!hasValidTxIns) {
    return false;
  }

  //
  const amountTxIns = tx.txIns.map(txIn => getAmountTxIn(txIn, uTxOutList)).reduce((a, b) => a + b, 0);

  //내 보유량-> 사용되지 않은 블럭체인 배영레서 갯수배열을 리턴받는다.
  const amountTxOuts = tx.txOuts.map(txOut => txOut.amount).reduce((a, b) => a + b, 0);

  if (amountTxIns !== amountTxOuts) {
    return false;
  } else {
    return true;
  }
}

//채굴한 트랜잭션(생성 얻은 코인 내역)검증한다.
const validateCoinbaseTx = (tx, blockIndex) => {
  if (getTxId(ts) !== tx.id) {
    return false;
  } else if (tx.txIns.length !== 1 ) {
    //채굴 코인베이스 트랜잭션은 한개의 인풋많이 존재한다. 블럭체인에서 오는 트랜잭션이다.
    return false;
  } else if (tx.txIns[0].txOutIndex !== blockIndex) {
    return false;
  } else if (tx.txOuts.length !== 1) {
    return false;
  } else if (tx.txOuts[0].amount !== COINBASE_AMOUNT) {
    return false;
  } else {
    return true;
  }

}

module.exports = {
  getPublicKey,
  getTxId,
  signTxIn,
  TxIn,
  Transaction,
  TxOut
}