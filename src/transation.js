// Tx === Transaction
const CryptoJs = require('crypto-js');
const Elliptic = require('elliptic');

const ec = new Elliptic('secp256k1');

//내보내는 transaction data class
class TxOut {
  constructor(address, amount) {
    this.address = address;
    this.amount = amount;
  }
}

class TxIn {
  //uTxOutId
  //uTxOutIndex
  //Sigunature

}

class Transaction {
  //ID
  //txIns[]
  //txOuts[]
}

//사용안된 transaction data class
class UTxOut {
  constructor(uTxOutId, uTxOutIndex, address, amount) {
    this.uTxOutId = uTxOutId;
    this.uTxOutIndex = uTxOutIndex;
    this.address = address;
    this.amount = amount;
  }
}

let uTxOuts = [];

const getTxId = tx => {
  //transaction 정보를 취합하여 하나의 스트링으로 리턴
  const txInContent = tx.txIns.map(txIn => (txIn.uTxOutId + txIn.txOutIndex)).reduce((a, b) => a+b, "");
  const txOutContent = tx.txOuts.map(txOuts => (txOuts.address + txOuts.amount)).reduce((a, b) => a+b, "");

  return CryptoJs.SHA256(txInContent + txOutContent).toString();
}

const signTxIn = (tx, txIndex, privateKey, uTxOut) => {
  const txIn = tx.txIndex[txIndex];
  const dataToSign = tx.id;
}