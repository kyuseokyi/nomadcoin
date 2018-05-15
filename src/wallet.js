const elliptic = require("elliptic");
const path = require("path");
const fs = require("fs");
const ec = new elliptic.ec('secp256k1');

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

module.exports = {
  initWallet
}