/* eslint-disable dot-notation */
/* eslint-disable camelcase */
/* eslint-disable import/no-unresolved */

const axios = require("axios");
const jwtDecode = require("jwt-decode");
const querystring = require("querystring");

const { encryptDataDiners } = require("../controllers/_helpers");
const { oauthServer } = require("../utils/constants");

async function directorDateTime() {
  return new Promise((resolve, reject) => {
    const options = {
      url: `${process.env.DIRECTOR_DIGITAL_URL}/directorDateTime`,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        channel: "IN",
      },
    };
    axios(options)
      .then((response) => resolve(response.data))
      .catch((error) => reject(error));
  });
}

/**
 * [DIRECTOR_CORE_TARJETAS_URL] singleSelectPublicKey
 * @returns - { publicKey: { publicKey } }
 */
async function singleSelectPublicKey() {
  return new Promise((resolve, reject) => {
    const options = {
      method: "POST",
      url: "https://director.dce.ec/desarrollo/directcall/singleSelectPublicKey",
      // url: `${process.env.DIRECTOR_CORE_TARJETAS_URL}/singleSelectPublicKey`,
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        channel: "IN",
        feature_id: "ROL@5500",
        func_type: "ADD",
        timestampcanal: new Date().toString(),
      },
      data: "{}",
    };
    axios(options)
      .then((response) => {
        console.log(
          "singleSelectPublicKey (resolve): ",
          JSON.stringify(response.data),
          JSON.stringify(options),
          "\n"
        );
        resolve(response.data);
      })
      .catch((error) => {
        console.log(
          "singleSelectPublicKey (reject): ",
          JSON.stringify(error),
          JSON.stringify(options),
          "\n"
        );
        reject(error);
      });
  });
}

// eslint-disable-next-line no-unused-vars
const getUsername = () => {
  return process.env.NODE_ENV === "development"
    ? oauthServer.default_oauth_username
    : "MERCHAN2024";
};

// eslint-disable-next-line no-unused-vars
const getPassword = () => {
  return process.env.NODE_ENV === "development"
    ? oauthServer.default_oauth_password
    : "Tech.2020";
};

/**
 * (OAUTH_SERVER_URL) getOauthToken
 * @returns
 * - expires_in,
 * - refresh_expires_in,
 * - access_token,
 * - refresh_token,
 * - id_token,
 * - token_type
 */
async function getOauthToken({
  authCode,
  stateCode,
  verifierCode,
  workflowId,
}) {
  return new Promise((resolve, reject) => {
    const parsedRedirectUri = new URL(oauthServer.oauth_redirect_uri).href;
    const body = {
      client_id: oauthServer.client_id_public,
      code_verifier: verifierCode,
      code: authCode,
      grant_type: oauthServer.grant_type_public,
      redirect_uri: `${parsedRedirectUri}?workflowId=${workflowId}`,
      scope: oauthServer.scope_private,
      state: stateCode,
    };
    const options = {
      method: "POST",
      url: oauthServer.oauth_server_url,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "*/*",
        channel: "IN",
        feature_id: "ROL@5500",
        func_type: "ADD",
        timeout: oauthServer.timeout,
        timestampcanal: new Date().toString(),
      },
      data: querystring.stringify(body),
    };
    axios(options)
      .then((response) => {
        console.log(
          "getOauthToken (resolve): ",
          JSON.stringify(response.data),
          JSON.stringify(options),
          "\n"
        );
        resolve(response.data);
      })
      .catch((error) => {
        console.log(
          "getOauthToken (reject): ",
          JSON.stringify(error),
          JSON.stringify(options),
          "\n"
        );
        reject(error);
      });
  });
}

/**
 * (DIRECTOR_CORE_BANCA) singleSelectCustomerBasicData
 * @param {*} params
 * @returns {
 *   customer: {
 *     imageProfile, firstName1, lastName1, customerId, additionalCustomerId,
 *     userProfile, name, customerUserName, isCustomerBanking, hasValueOffers,
 *   },
 *   establishment: {
 *     ruc, businessName
 *     email: { emailAddressComplete }
 *   },
 *   collection: {
 *     profile: [
 *       { profileType: { mnemonic, shortDesc } }, ...
 *     ]
 *   }
 * }
 */
async function singleSelectCustomerBasicData({
  access_token,
  id_token,
  llave_simetrica,
  userName,
}) {
  return new Promise((resolve, reject) => {
    const data = {
      customer: {
        "@name": "customer",
        systemUser: {
          userName: encryptDataDiners(userName),
        },
      },
    };
    const options = {
      method: "POST",
      url: `${process.env.DIRECTOR_CORE_BANCA_URL}/singleSelectCustomerBasicData`,
      headers: {
        "Content-type": "application/json",
        accept: "application/json",
        access_token,
        channel: "IN",
        feature_id: "ROL@5500",
        func_type: "ADD",
        grant_type: oauthServer.grant_type_public,
        id_token,
        llave_simetrica,
        timestampcanal: new Date().toString(),
      },
      data,
    };
    axios(options)
      .then((response) => {
        console.log(
          "singleSelectCustomerBasicData (resolve): ",
          JSON.stringify(response.data),
          JSON.stringify(options),
          "\n"
        );
        resolve(response.data);
      })
      .catch((error) => {
        console.log(
          "singleSelectCustomerBasicData (reject): ",
          JSON.stringify(error),
          JSON.stringify(options),
          "\n"
        );
        reject(error);
      });
  });
}

/**
 * (DIRECTOR_CORE_TARJETAS_URL) verifyCustomerIpBlocked
 * @param {*} params
 * @returns - { dataExecutionTransaction: { concept, resultString, executionTransactionStatus: {} } }
 */

function decryptUsername(access_token) {
  const tokenData = jwtDecode(access_token);
  if (
    tokenData &&
    tokenData.preferred_username &&
    tokenData.preferred_username.toString
  ) {
    return tokenData.preferred_username.toString();
  }
  return "";
}

async function verifyCustomerIpBlocked({ access_token, id_token, userName }) {
  return new Promise((resolve, reject) => {
    const data = {
      customer: {
        "@name": "customer",
        "@dataModel": "diners.financials",
        "@version": "1.0",
        originCustomer: { shortDesc: "PBN" },
        systemUser: {
          // password: encryptDataDiners(getPassword()),
          userName,
        },
      },
    };
    const options = {
      method: "POST",
      url: `${process.env.DIRECTOR_CORE_TARJETAS_URL}/verifyCustomerIpBlocked`,
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        access_token,
        channel: "IN",
        feature_id: "ROL@5500",
        func_type: "ADD",
        id_token,
        timestampcanal: new Date().toString(),
      },
      data,
    };

    axios(options)
      .then((response) => {
        console.log(
          "verifyCustomerIpBlocked (resolve): ",
          JSON.stringify(response.data),
          JSON.stringify(options),
          "\n"
        );
        resolve(response.data);
      })
      .catch((error) => {
        console.log(
          "verifyCustomerIpBlocked (reject): ",
          JSON.stringify(error),
          JSON.stringify(options),
          "\n"
        );
        reject(error);
      });
  });
}

/**
 * (DIRECTOR_CORE_TARJETAS_URL) singleSelectTaskDevice
 * @param {*} params
 * @returns - { dataExecutionTransaction: { coreReferenceNumber, coreResultString }, device: { active } }
 */
async function singleSelectTaskDevice({
  access_token,
  id_token,
  customerId,
  deviceFp = null,
}) {
  return new Promise((resolve, reject) => {
    const data = {
      customer: {
        "@name": "customer",
        "@dataModel": "diners.financials",
        "@version": "1.0",
        originCustomer: { shortDesc: "PBN" },
        customerId,
      },
      device: {
        "@name": "device",
        "@dataModel": "productv2.financials",
        "@version": "1.0",
        sDeviceId: deviceFp,
      },
    };
    const options = {
      method: "POST",
      url: `${process.env.DIRECTOR_CORE_TARJETAS_URL}/singleSelectTaskDevice`,
      headers: {
        "accept-language": "es-419,es;q=0.9",
        "content-type": "application/json",
        accept: "application/json",
        access_token,
        channel: "IN",
        feature_id: "ROL@5500",
        func_type: "ADD",
        id_token,
        timestampcanal: new Date().toString(),
      },
      data,
    };
    axios(options)
      .then((response) => {
        console.log(
          "singleSelectTaskDevice (resolve): ",
          JSON.stringify(response.data),
          JSON.stringify(options),
          "\n"
        );
        resolve(response.data);
      })
      .catch((error) => {
        console.log(
          "singleSelectTaskDevice (reject): ",
          JSON.stringify(error),
          JSON.stringify(options),
          "\n"
        );
        reject(error);
      });
  });
}

async function massiveSelectProductOptionsToOffer({
  access_token,
  id_token,
  customerId,
}) {
  return new Promise((resolve, reject) => {
    const data = {
      customer: {
        "@name": "customer",
        "@version": "1.0",
        "@dataModel": "diners.financials",
        originCustomer: { shortDesc: "PBN" },
        customerId,
      },
    };
    const options = {
      url: `${process.env.DIRECTOR_CORE_TARJETAS_URL}/massiveSelectProductOptionsToOffer`,
      method: "POST",
      headers: {
        channel: "kon",
        "Content-Type": "application/json",
        grant_type: oauthServer.grant_type_public,
        access_token,
        id_token,
        feature_id: "ROL@5509", // ***
        func_type: "DPC", // ***
        pagination_info: "cantRegistros=20;numTotalPag=1;numPagActual=1;",
      },
      data,
    };
    axios(options)
      .then((response) => {
        console.log(
          "massiveSelectProductOptionsToOffer (resolve): ",
          JSON.stringify(response.data),
          JSON.stringify(options),
          "\n"
        );
        resolve(response.data);
      })
      .catch((error) => {
        console.log(
          "massiveSelectProductOptionsToOffer (reject): ",
          JSON.stringify(error),
          JSON.stringify(options),
          "\n"
        );
        reject(error);
      });
  });
}

module.exports = {
  // getUsername,
  // getPassword,
  decryptUsername,

  directorDateTime,
  singleSelectPublicKey,
  getOauthToken,
  singleSelectCustomerBasicData,
  verifyCustomerIpBlocked,
  singleSelectTaskDevice,

  massiveSelectProductOptionsToOffer,
};
