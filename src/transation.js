// Tx === Transaction
const CryptoJs = require('crypto-js');
const Elliptic = require('elliptic');
const utils = require('./utils');

const ec = new Elliptic.ec('secp256k1');

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
  //uTxOutId
  //uTxOutIndex
  //Sigunature

}

//거래 내역 data 클랙스
//모든 거래내역을 가지고 있음(입출금 내역)
class Transaction {
  //ID 고유 id
  //txIns[] 입금내역 배열
  //txOuts[] 출금내역 배열
}

//사용안된 transaction data class
//사용하지 않은 아웃풋 이전 트랜잭션에서.
//거래가 발생되면 사용되지 않은 트랜잭션 사용 내역을 가지고 거래를 시작한다.
//현재 보유중인 코인(블럭체인)및 거래 내역이다. 입출금등 거래가 발생후 최종적으로 업데이트 해야한다.
//거래의 시작이자 마지막이다.
//내 블럭체인(코인내역이다.) 내가 소유한. 거래가 발생하여 블럭으 받거나 사용했다면 추가및 삭제해야한다.
let uTxOuts = [];

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

const signTxIn = (tx, txIndex, privateKey, uTxOut) => {
  const txIn = tx.txIndex[txIndex];
  const dataToSign = tx.id;
  //todo Find transaction to input - 트랜잭션을 하기위해 넣어야 인풋값을 찾아야함 현재 값은 이전에 발생한 트랜잭션의 아웃풋이다.
  const referencedUTxOut = findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOuts);
  if (referencedUTxOut === null) {
    //해당 값이 널이라면 내가 사용할 coin이 없다는 의미.
    //코인을 보내기위해서 내가 보낼코인과 같거나 많은 코인을 보유 하고 있어야한다.
    console.log('Not enough coin');
    return;
  }

  //todo: sign the txIn
  const key = ec.keyFromPrivate(privateKey, "hex");
  const signature = utils.toHexString(key.sign(dataToSign).toDER());
  return signature;
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