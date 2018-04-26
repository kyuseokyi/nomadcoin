const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const Blockchain = require('./blockchain');

const { getBlockchain, createNewBlock } = Blockchain;

const PORT = 3000;

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
app.listen(PORT, () => console.log('coin server running on ${PORT}'));
