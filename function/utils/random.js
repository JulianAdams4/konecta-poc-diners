const nodeCrypto = require("crypto");

function getRandomValues(buf) {
  if (nodeCrypto.randomBytes) {
    if (!(buf instanceof Uint8Array)) {
      throw new TypeError("expected Uint8Array");
    }
    if (buf.length > 65536) {
      const e = new Error();
      e.code = 22;
      e.message = `Failed to execute 'getRandomValues' on 'Crypto': The ArrayBufferView's byte length (${buf.length}) exceeds the number of bytes of entropy available via this API (65536).`;
      e.name = "QuotaExceededError";
      throw e;
    }
    const bytes = nodeCrypto.randomBytes(buf.length);
    buf.set(bytes);
    return buf;
  }
  throw new Error("No secure random number generator available.");
}

const charSet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function getSecureRandomNumber() {
  const array = new Uint8Array(1);
  getRandomValues(array);
  return `0.${array[0].toString()}`;
}

function getCodeByBits(bits) {
  return Array.apply(0, Array(bits))
    .map(function () {
      return (function (charset) {
        return charset.charAt(
          Math.floor(getSecureRandomNumber() * charset.length)
        );
      })(charSet);
    })
    .join("");
}

function getStateCode2() {
  return getCodeByBits(32);
}

function getVerifierCode2() {
  return getCodeByBits(128);
}

module.exports = { getStateCode2, getVerifierCode2 };
