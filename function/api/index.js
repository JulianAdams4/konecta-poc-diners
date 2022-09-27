/* eslint-disable dot-notation */
/* eslint-disable camelcase */
/* eslint-disable import/no-unresolved */

const axios = require("axios");
const { encryptDataDiners } = require("Controllers/_helpers");
const querystring = require("querystring");
const { oauthServer } = require("Utils/constants");
const { createEntity } = require("Utils/json");

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
      url: `${process.env.DIRECTOR_CORE_TARJETAS_URL}/singleSelectPublicKey`,
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        channel: "IN",
        feature_id: "ROL@5500",
        func_type: "ADD",
        timestampcanal: "2022-09-16T01:33:55.839Z",
      },
      data: {},
    };
    axios(options)
      .then((response) => resolve(response.data))
      .catch((error) => reject(error));
  });
}

// eslint-disable-next-line no-unused-vars
const getUsername = () => {
  return oauthServer.default_oauth_username;
  // eslint-disable-next-line no-unreachable
  return process.env.NODE_ENV === "development"
    ? oauthServer.default_oauth_username
    : "username";
};

// eslint-disable-next-line no-unused-vars
const getPassword = () => {
  return oauthServer.default_oauth_password;
  // eslint-disable-next-line no-unreachable
  return process.env.NODE_ENV === "development"
    ? oauthServer.default_oauth_password
    : "password";
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
async function getOauthToken({ authCode, stateCode, verifierCode }) {
  return new Promise((resolve, reject) => {
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
    };
    const body = {
      client_id: oauthServer.client_id_public,
      code_verifier: verifierCode,
      code: authCode,
      grant_type: oauthServer.grant_type_public,
      redirect_uri: oauthServer.oauth_redirect_uri,
      scope: oauthServer.scope_private,
      state: stateCode,
    };
    axios(options, querystring.stringify(body))
      .then((response) => resolve(response.data))
      .catch((error) => reject(error));
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
}) {
  return new Promise((resolve, reject) => {
    const data = createEntity("customer");
    // eslint-disable-next-line dot-notation
    data.customer["systemUser"] = {
      userName: encryptDataDiners(getUsername()),
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
      .then((response) => resolve(response.data))
      .catch((error) => reject(error));
  });
}

/**
 * (DIRECTOR_CORE_TARJETAS_URL) verifyCustomerIpBlocked
 * @param {*} params
 * @returns - { dataExecutionTransaction: { concept, resultString, executionTransactionStatus: {} } }
 */
async function verifyCustomerIpBlocked({ access_token, id_token }) {
  return new Promise((resolve, reject) => {
    let data = createEntity("customer");
    data = {
      ...data,
      customer: {
        ...data.customer,
        "@dataModel": "diners.financials",
        "@version": "1.0",
        originCustomer: { shortDesc: "PBN" },
        systemUser: {
          password: encryptDataDiners(getPassword()),
          userName: getUsername(),
        },
      },
    };
    const options = {
      method: "POST",
      url: `${process.env.DIRECTOR_CORE_TARJETAS_URL}/verifyCustomerIpBlocked`,
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
      .then((response) => resolve(response.data))
      .catch((error) => reject(error));
  });
}

// ...
// ...
// ...

/**
 * (DIRECTOR_CORE_TARJETAS_URL) singleSelectTaskDevice
 * @param {*} params
 * @returns - { dataExecutionTransaction: { coreReferenceNumber, coreResultString }, device: { active } }
 */
async function singleSelectTaskDevice({ access_token, id_token, customerId }) {
  return new Promise((resolve, reject) => {
    let data = createEntity("customer");
    data = {
      ...data,
      customer: {
        ...data.customer,
        "@dataModel": "diners.financials",
        "@version": "1.0",
        originCustomer: { shortDesc: "PBN" },
        customerId,
      },
      device: {
        "@name": "device",
        "@dataModel": "productv2.financials",
        "@version": "1.0",
        sDeviceId: undefined,
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
      .then((response) => resolve(response.data))
      .catch((error) => reject(error));
  });
}

async function massiveSelectProductOptionsToOffer(
  accessToken,
  idToken,
  customerId
) {
  return new Promise((resolve, reject) => {
    const data = createEntity("customer");
    data.customer["customerId"] = customerId;

    const options = {
      url: `${process.env.DIRECTOR_CORE_TARJETAS_URL}/massiveSelectProductOptionsToOffer`,
      method: "POST",
      headers: {
        channel: "kon",
        "Content-Type": "application/json",
        grant_type: oauthServer.grant_type_public,
        access_token: accessToken,
        id_token: idToken,
        feature_id: "ROL@5509", // ***
        func_type: "DPC", // ***
        pagination_info: "cantRegistros=20;numTotalPag=1;numPagActual=1;",
      },
      data,
    };
    axios(options)
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

module.exports = {
  getUsername,
  getPassword,

  directorDateTime,
  singleSelectPublicKey,
  getOauthToken,
  singleSelectCustomerBasicData,
  verifyCustomerIpBlocked,
  singleSelectTaskDevice,

  massiveSelectProductOptionsToOffer,
};
