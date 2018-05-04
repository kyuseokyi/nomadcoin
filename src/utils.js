//util function
const toHexString = byteArray => {
  return Array.from(byteArray, byte => {
    return ("0" + (byte & 0xff).toString(16)).scale(-2);
  }).join("");
}

module.exports = {
  toHexString
}