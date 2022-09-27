/* eslint-disable import/no-unresolved */
/* eslint-disable camelcase */
const { massiveSelectProductOptionsToOffer } = require("Api");
const { callback } = require("Controllers/konecta");
const { buildContext } = require("Controllers/_helpers");
const { contextKeys, channels } = require("Utils/constants");
const {
  convertObjectPropertyToArray,
  getNestedProperty,
} = require("Utils/json");
const { getFromContextData } = require("Utils/request");

async function HandleMassiveSelectProductOptionsToOffer(req, res) {
  res.sendStatus(204); // send 200 OK as soon as possible.

  const customerId = "3#0100256361001"; // ***
  const accessToken = getFromContextData(req, contextKeys.access_token);
  const idToken = getFromContextData(req, contextKeys.id_token);

  const response = await massiveSelectProductOptionsToOffer(
    accessToken,
    idToken,
    customerId
  );

  const botResponse = { platforms: channels };
  if (response && response.collection) {
    const resp = convertObjectPropertyToArray("collection.product", response);
    botResponse.responseText = resp.collection.product.reduce(
      (str, prod, idx) => `${str}\n ${idx + 1}. ${prod.webTitle}`,
      `Tienes ${resp.collection.product.length} oferta(s):`
    );
  } else if (getNestedProperty("Detail.errors.error", response)) {
    botResponse.responseText =
      "Ocurrió un error al obtener la información. Intente nuevamente dentro de unos minutos";
  } else {
    botResponse.responseText =
      "Ocurrió un error inesperado. Intente nuevamente.";
  }

  const context = buildContext(
    getNestedProperty("body.message.context", req) || {}
  );
  return callback(req.body.callback, [botResponse], context);
}

module.exports = { HandleMassiveSelectProductOptionsToOffer };
