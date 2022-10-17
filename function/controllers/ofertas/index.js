/* eslint-disable camelcase */
/* eslint-disable prefer-destructuring */

const url = require("url");

const { channels } = require("../../utils/constants");
const JsonUtils = require("../../utils/json");
const { getFromContextData } = require("../../utils/request");
const { callback, formTextResponse } = require("../konecta");
const { buildContext } = require("../_helpers");
const API = require("../../api");
const dbSessions = require("../../utils/database");

async function HandleMassiveSelectProductOptionsToOffer(req, res) {
  let requestContext = null;
  let requestCallback = null;
  try {
    const urlParts = url.parse(req.url, true);
    const queryWorkflowId = urlParts.query.workflowId;
    const contextWorkflowId = getFromContextData(req, "workflowId");
    const workflowId = contextWorkflowId || queryWorkflowId;

    const prevData = dbSessions.findOne({ key: workflowId });
    if (!prevData || !prevData.value || !prevData.value.callback) {
      global.logger.error({
        message: "Se perdió el workflowId",
        label: global.getLabel(__dirname, __filename),
      });
      return res.sendStatus(200);
    }
    requestCallback = prevData.value.callback;
    requestContext = prevData.value.initialContext;
    // *************************************
    res.sendStatus(200); // send 200 OK as soon as possible.
    // *************************************
    await callback(
      requestCallback,
      formTextResponse(
        channels,
        "Obteniendo información de las ofertas. Por favor espere unos momentos ⏳"
      ),
      buildContext(requestContext || {})
    );
    // *************************************
    const id_token = prevData.value.id_token;
    const customerId = prevData.value.customerId;
    const access_token = prevData.value.access_token;

    const response6 = await API.massiveSelectProductOptionsToOffer({
      access_token,
      id_token,
      customerId,
    });
    let offersResponseText = "";
    const type = {
      LOA: "Crédito",
      CUE: "Cuenta nueva",
      ANF: "Anticipo",
    };
    if (response6 && response6.collection) {
      const resp = JsonUtils.convertObjectPropertyToArray(
        "collection.product",
        response6
      );
      if (resp.collection.product.length) {
        offersResponseText = [
          `Tienes ${resp.collection.product.length} oferta(s):`,
          resp.collection.product
            .map(
              (prod, idx) =>
                `${idx + 1}.- Tipo: ${
                  type[prod.applicationCode]
                }. Monto aprobado: $${parseFloat(prod.amountApproved)}`
            )
            .join("\n"),
        ].join("\n\n");
      } else {
        offersResponseText = "Por el momento no tienes ofertas de valor 🔎";
      }
    } else if (JsonUtils.getNestedProperty("Detail.errors.error", response6)) {
      offersResponseText =
        "Ocurrió un error al obtener la información. Intente nuevamente dentro de unos minutos 🔄";
    } else {
      offersResponseText =
        "Ocurrió un error inesperado. Intente nuevamente ❗️";
    }

    return await callback(
      requestCallback,
      formTextResponse(channels, offersResponseText),
      buildContext(requestContext || {})
    );
  } catch (ex) {
    global.logger.error({
      message: ex && ex.message ? ex.message : ex,
      label: global.getLabel(__dirname, __filename),
    });
    if (!requestCallback) {
      global.logger.error({
        message: "No hay callback para responder",
        label: global.getLabel(__dirname, __filename),
      });
      return res.sendStatus(200);
    }
    // Se puede responder
    await callback(
      requestCallback,
      formTextResponse(
        channels,
        "Ocurrió un error al procesar tu solicitud. Lamentamos el inconveniente"
      ),
      buildContext(requestContext || {})
    );
    return res.sendStatus(200);
  }
}

module.exports = {
  HandleMassiveSelectProductOptionsToOffer,
};
