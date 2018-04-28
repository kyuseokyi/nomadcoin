const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const Blockchain = require('./blockchain');
const P2P = require('./p2p');

const { getBlockchain, createNewBlock } = Blockchain;
const { startP2PServer, connectToPeers   } = P2P;

//환경변수가 없다면 3000으로 시작.
const PORT = process.env.HTTP_PORT || 3000;

const app = express();

app.use(bodyParser.json());
app.use(morgan("combined"));

app.get("/blocks", (req, res) => {
  res.send(getBlockchain());
});

app.post("/blocks", (req, res) => {
  const { body: { data } } =  req;
  const newBlock = createNewBlock(data);
  res.send(newBlock);
});

app.post("/peers", (req, res) => {
  const { body: {peer} } = req;
  connectToPeers(peer);
  res.send();
});

const server = app.listen(PORT, () =>
  console.log('coin HTTP server running on %s', PORT)
);

startP2PServer(server);
