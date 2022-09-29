/* eslint-disable import/order */
/* eslint-disable dot-notation */
/* eslint-disable no-underscore-dangle */
/* eslint-disable camelcase */

const crypto = require("crypto");
const base64url = require("base64url");
const CryptoJS = require("crypto-js");
const JSEncrypt = require("node-jsencrypt");

const { contextKeys } = require("../utils/constants");
const { getNestedProperty } = require("../utils/json");
const { saveInContextData } = require("../utils/request");

function buildContext(context) {
  const newContext = JSON.parse(JSON.stringify(context));
  delete newContext.interactionId;
  delete newContext.responses;
  if (newContext.control) {
    const { control } = newContext;
    delete control.interactionId;
    newContext.control = control;
  }
  if (newContext.data) {
    const { data } = newContext;
    delete data[contextKeys._error];
    delete data[contextKeys._error_meta];
    newContext.data = data;
  } else {
    // eslint-disable-next-line dot-notation
    newContext["data"] = {};
  }
  return newContext;
}

function getAuthorization(context) {
  return `Bearer ${
    getNestedProperty(context, `data.${contextKeys.access_token}.0`) || ""
  }`.trim();
}

function parseCookies(request) {
  const list = {};
  const cookieHeader = request.headers ? request.headers.cookie : undefined;
  if (!cookieHeader) return list;
  cookieHeader.split(`;`).forEach(function (cookie) {
    // eslint-disable-next-line prefer-const
    let [name, ...rest] = cookie.split(`=`);
    name = name ? name.trim() : undefined;
    if (!name) return;
    const value = rest.join(`=`).trim();
    if (!value) return;
    list[name] = decodeURIComponent(value);
  });
  return list;
}

// ...............

const charSet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function getSecureRandomNumber() {
  // const cryptoA = window.crypto || window.msCrypto;
  // if (!cryptoA) return null;
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
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

function getStateCode() {
  return getCodeByBits(32);
}

function getVerifierCode() {
  return getCodeByBits(128);
}

function generateCodeChallenge(codeVerifier) {
  const hash = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64");
  return base64url.fromBase64(hash);
}

//
function getDeadlineMs(expiration) {
  if (!expiration) return null;
  // eslint-disable-next-line radix
  const expirationMs = parseInt(`${expiration}`) * 1000;
  return Date.now() + expirationMs;
}

function saveOauthTokenResponse(req, response) {
  if (response.expires_in && response.refresh_expires_in) {
    saveInContextData(req, contextKeys.access_token, response.access_token);
    // saveInContextData(req, contextKeys.expires_in, response.expires_in);
    // saveInContextData(
    //   req,
    //   contextKeys.refresh_expires_in,
    //   response.refresh_expires_in
    // );
    saveInContextData(req, contextKeys.refresh_token, response.refresh_token);
    saveInContextData(req, contextKeys.token_type, response.token_type);
    saveInContextData(req, contextKeys.id_token, response.id_token);
    saveInContextData(req, contextKeys.session_state, response.session_state);
    saveInContextData(req, contextKeys.scope, response.scope);

    const sessionDeadline = getDeadlineMs(response.expires_in);
    saveInContextData(req, contextKeys._deadline, sessionDeadline);

    const refreshDeadline = getDeadlineMs(response.refresh_expires_in);
    saveInContextData(req, contextKeys._next_refresh, refreshDeadline);
  }
}

// eslint-disable-next-line no-unused-vars
const publicRSAKey =
  "-----BEGIN PUBLIC KEY-----" +
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4b2L3Gk8Q+qlcFQSRmho" +
  "/fDPvrZ3A5jx3/9XE2X7N6EO2F9RcH23b8EY8hEEd7lHNXqHDYcpt97QPgey1lTq" +
  "NItUrRqYFACU+5FFxUD6hwcibZFRaBy8PjHsfT2m9VcTlCAvViybHrwWMH73o9V8" +
  "zLJfoFtxKKxfiTv4CBVIxLN+dTOJbqKgOYSRCG/3022rWcB4KpUqQlqTfp+3CreI" +
  "IOcTVq9MZ41MvniMczBdC4ywOtBm/sd9acpUch2MKUbEe8nL9izfjahS6MADFAHq" +
  "DTStCAsfPwh5S3yOj0cVtun6rkMhPG1Av6HT1bAWW8Du6BvF1ZKdC4ZY4t3/e005" +
  "oQIDAQAB" +
  "-----END PUBLIC KEY-----";

global["keyEncripted"] = "";
global["key"] = "";
global["publicKey"] = "";

function getKey() {
  return String(CryptoJS.lib.WordArray.random(16));
}

function setPublicKey(publicKeyParam) {
  global.publicKey = publicKeyParam;
}

function encryptTextDiners(publicKeyParam, text) {
  if (text && publicKeyParam) {
    const encrypt = new JSEncrypt();
    encrypt.setPublicKey(publicKeyParam);
    const encryptedValue = String(encrypt.encrypt(text));
    return encryptedValue;
  }
  return "";
}

function getKeyDiners() {
  if (!global.key) {
    global.key = getKey();
    global.keyEncripted = encryptTextDiners(global.publicKey, global.key);
  }
}

function encryptDataDiners(value, keyParam = null) {
  if (keyParam === null) {
    getKeyDiners();
  }
  const simetricKey = CryptoJS.enc.Utf8.parse(
    keyParam === null ? global.key : keyParam
  );
  // this is Base64-encoded encrypted data
  const encryptedData = CryptoJS.AES.encrypt(value, simetricKey, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return String(encryptedData);
}

function getKeyEncripted() {
  if (!global.key) {
    getKeyDiners();
  }
  if (!global.keyEncripted) {
    global.keyEncripted = encryptTextDiners(global.publicKey, global.key);
  }
  return global.keyEncripted;
}

function getPublicKeyEncripted(publicKeyParam, keyParam = null) {
  if (global.key === "" || global.key === undefined) {
    global.key = getKey();
  }
  global.keyEncripted = encryptTextDiners(
    publicKeyParam,
    keyParam === null ? global.key : keyParam
  );
  return global.keyEncripted;
}

module.exports = {
  buildContext,
  getAuthorization,
  parseCookies,
  // ...
  charSet,
  getSecureRandomNumber,
  getCodeByBits,
  getStateCode,
  getVerifierCode,
  generateCodeChallenge,
  getDeadlineMs,
  // ..
  saveOauthTokenResponse,
  getKey,
  setPublicKey,
  encryptTextDiners,
  getKeyDiners,
  encryptDataDiners,
  getKeyEncripted,
  getPublicKeyEncripted,
};
