const Elliptic = require("elliptic");
const path = require("path");
const fs = require("fs");
const ec = new Elliptic.ec('secp256k1');
const _= require("lodash");
const transaction = require("./transation");

const { getPublicKey, getTxId, signTxIn, TxIn, Transaction, TxOut } = transaction;

const privateKeyLocation = path.join(__dirname, "privateKey");

//generate private key fun
const generatePriavetKey = () => {
  const keyPair = ec.genKeyPair();
  const privateKey = keyPair.getPrivate();
  //hex 값으로 리턴한다.
  return privateKey.toString(16);
}

//get private key
const getPrivateKeyFromWallet = () => {
  const buffer = fs.readFileSync(privateKeyLocation, "utf-8");
  buffer.toString();
}

const getPublicKeyFromWallet = () => {
  const privateKey = getPrivateKeyFromWallet();
  const key = ec.keyFromPrivate(privateKey, "hex");
  return key.getPublic().excode("hex");
}

//get balance - 잔고 내역을 가져온다. 내가 소유한 코인 내역.
//사용하지 않은 거래내역 uTxOuts
const getBalance = (address, uTxOuts) => {
  return _(uTxOuts).filter(uTxOut => uTxOut.address === address).map(uTxOut => uTxOut.amount).sum();
}


//init wallet
const initWallet = () => {
  if (fs.existsSync(privateKeyLocation)) {
    return;
  }
  //privatekey가 존재하지 않다면 생성해준다.
  const newPrivateKey = generatePriavetKey();
  //privatekey를 생성한후 저장한다.
  fs.writeFileSync(privateKeyLocation, newPrivateKey);
}

//실제 소유한 coin 돈을 가져온다.
const findAmountInUTxOuts = (amountNeeded, uTxOuts, txOut) => {
  let currentAmount = 0;
  const includedUTxOuts = [];
  for (const myUTxOut of myUTxOuts) {
    includedUTxOuts.push(myUTxOut);
    currentAmount = currentAmount = myUTxOut.amount;
    if (currentAmount >= amountNeeded) {
      const leftOverAmount = currentAmount - amountNeeded;
      return { includedUTxOuts, leftOverAmount };
    }
  }
  //자금 부족.
  console.log("Not enough founds")
  return false;
}
// 거래 송급
// receiverAddress -> 받을 주소.
// myAddress -> 보내고 남은 것을 받을 주소.
const createTxOuts = (receiverAddress, myAddress, amount, leftOverAmount) => {
  const receiverTxOut = new TxOut(receiverAddress, amount);
  if (leftOverAmount === 0) {
    return [receiverTxOut];
  } else {
    const leftOverTransaction = new TxOut(myAddress, leftOverAmount);
    return [receiverAddress, leftOverAmount];
  }

}

//transaction 을 생성한다.
//amount 얼마를 보낼것인가.
//
const createTx = (receiverAddress, amount, privateKey, uTxOutList) => {
  const myAddress = getPublicKey(privateKey);
  //내소유의 사용하지 않은 거래내역을 얻어야한다. 블록체인에 소유하고 있는 돈을 의미
  const myUTxOuts = uTxOutList.filter(uTxOut => uTxOut.address === myAddress);

  const { includedUTxOuts, leftOverAmount } = findAmountInUTxOuts(amount, myUTxOuts);

  const toUnSignedUTxIn = uTxOut => {
    const txIn = new TxIn();
    txIn.txOutId = uTxOut.txOutId;
    txIn.txOutIndex = uTxOut.txOutIndex;
  }

  const unsignedTxIns = includedUTxOuts.map(toUnSignedUTxIn);

  const tx = new Transaction();

  tx.txIns = unsignedTxIns;
  tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);
  tx.id = getTxId(tx)

  tx.txIns = tx.txIns.map((txIn, index) => {
      txIn.signature = signTxIn(tx, index, privateKey, uTxOutList);
      return txIn;
  });

  return tx;
}

module.exports = {
  initWallet
}