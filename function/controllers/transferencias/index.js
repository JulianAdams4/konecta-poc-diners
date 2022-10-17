/* eslint-disable no-restricted-syntax */
/* eslint-disable camelcase */
/* eslint-disable prefer-destructuring */

const { channels } = require("../../utils/constants");
const JsonUtils = require("../../utils/json");
const {
  // getFromContextData,
  getUserInputFromContext,
  getFromContextData,
} = require("../../utils/request");
const {
  callback,
  formTextResponse,
  getWorkflowId,
  formTextWithOptionsResponse,
} = require("../konecta");
const { buildContext } = require("../_helpers");
const API = require("../../api");
const dbSessions = require("../../utils/database");

async function ListOwnAccounts(req, res, contextKey) {
  let requestContext = null;
  let requestCallback = null;
  try {
    const [workflowId] = getWorkflowId(req);
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
    delete requestContext.data.transferError;
    res.sendStatus(200); // send 200 OK as soon as possible.
    // *************************************
    let selectedInOrigin = null;

    if (contextKey === "targetAccount") {
      const selectedIndexByUser = `${getUserInputFromContext(req)}`;
      const originIndexes = getFromContextData(
        req,
        "originAccountIndexes",
        true
      );
      if (originIndexes.includes(selectedIndexByUser)) {
        const originList = getFromContextData(req, "originAccountList");
        const originAccArrIndex = parseInt(selectedIndexByUser, 10) - 1;
        const selectedAccountData = JSON.parse(originList[originAccArrIndex]);

        prevData.value.initialContext.data.originAccountSelected = [
          JSON.stringify(selectedAccountData),
        ];
        requestContext.data.originAccountSelected = [
          JSON.stringify(selectedAccountData),
        ];
        dbSessions.update(prevData);

        selectedInOrigin = { ...selectedAccountData }; // For filter target accounts
      } else {
        return await callback(
          requestCallback,
          formTextResponse(
            channels,
            "El valor ingresado no está dentro de las opciones ❗️"
          ),
          buildContext(requestContext || {})
        );
      }
    }
    // *************************************
    const id_token = prevData.value.id_token;
    const customerId = prevData.value.customerId;
    const access_token = prevData.value.access_token;

    const response6 = await API.massiveSelectCustomerProductForBankByExample({
      access_token,
      customerId,
      id_token,
      product: "CUE", // ***
    });
    let responseText = "";
    let responseOptions = null;
    if (response6 && response6.collection) {
      const resp = JsonUtils.convertObjectPropertyToArray(
        "collection.account",
        response6
      );
      if (resp.collection.account.length) {
        const activeAccountsFirstLine = "Cuentas activas disponibles:";

        let activeAccountList = resp.collection.account.filter(
          (acc) => acc.accountStatus !== "INACTIVA"
        );
        if (contextKey === "targetAccount") {
          // Avoid useless transfers for self-account
          activeAccountList = activeAccountList.filter(
            (acc) => acc.accountNumber !== selectedInOrigin.accountNumber
          );
        }
        activeAccountList = activeAccountList.map((acc) => {
          const maskedAccountNumber = JsonUtils.maskAccountNumber(
            acc.accountNumber
          );
          return {
            type: acc.type,
            name: acc.name,
            accountNumber: acc.accountNumber,
            maskedAccountNumber,
          };
        });
        // **********************************
        let accountIndex = 1;
        const accountsIndexes = []; // For bubble suggestions
        const accountsFormattedList = []; // For UI presentation
        for (const acc of activeAccountList) {
          accountsFormattedList.push(
            [
              `${accountIndex}:`,
              acc.name,
              acc.maskedAccountNumber,
              acc.type,
            ].join("\n")
          );
          accountsIndexes.push(String(accountIndex));
          accountIndex += 1;
        }
        // **********************************
        const lastMessageLine = `\nSelecciona la cuenta de ${
          contextKey === "originAccount" ? "origen" : "destino"
        } :`;
        responseText = [
          activeAccountsFirstLine,
          accountsFormattedList.join("\n\n"),
          lastMessageLine,
        ].join("\n");
        responseOptions = accountsIndexes.map((idx) => ({
          type: "button",
          text: idx,
          payload: idx,
        }));
        // **********************************
        prevData.value.initialContext.data[`${contextKey}List`] =
          activeAccountList.map(String);
        prevData.value.initialContext.data[`${contextKey}Indexes`] =
          accountsIndexes;
        requestContext.data[`${contextKey}List`] =
          activeAccountList.map(String);
        requestContext.data[`${contextKey}Indexes`] = accountsIndexes;
        dbSessions.update(prevData);
      } else {
        responseText = "Por el momento no tienes cuentas disponibles 🔎";
        requestContext.data.transferError = [responseText];
      }
    } else if (JsonUtils.getNestedProperty("Detail.errors.error", response6)) {
      responseText =
        "Ocurrió un error al obtener la información. Intente nuevamente dentro de unos minutos 🔄";
      requestContext.data.transferError = [
        "Ocurrió un error no controlado al obtener la información",
      ];
    } else {
      responseText =
        "Ocurrió un error inesperado. Intente nuevamente dentro de unos momentos❗️";
      requestContext.data.transferError = [responseText];
    }

    return await callback(
      requestCallback,
      responseOptions
        ? formTextWithOptionsResponse(channels, responseText, responseOptions)
        : formTextResponse(channels, responseText),
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
    requestContext.data.transferError = [ex && ex.message ? ex.message : ex];
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

async function saveAmount(req, res, saveMode) {
  let requestContext = null;
  let requestCallback = null;
  try {
    const [workflowId] = getWorkflowId(req);
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
    delete requestContext.data.transferError;
    res.sendStatus(200); // send 200 OK as soon as possible.

    let lastMessage = "";
    if (saveMode === "saveTarget") {
      const selectedIndexByUser = `${getUserInputFromContext(req)}`;
      const targetIndexes = getFromContextData(
        req,
        "targetAccountIndexes",
        true
      );
      if (targetIndexes.includes(selectedIndexByUser)) {
        const targetList = getFromContextData(req, "targetAccountList");
        const targetAccArrIndex = parseInt(selectedIndexByUser, 10) - 1;
        const selectedAccountData = JSON.parse(targetList[targetAccArrIndex]);
        prevData.value.initialContext.data.targetAccountSelected = [
          JSON.stringify(selectedAccountData),
        ];
        requestContext.data.targetAccountSelected = [
          JSON.stringify(selectedAccountData),
        ];
        dbSessions.update(prevData);

        lastMessage = "Se guardaron los datos";
      } else {
        requestContext.data.transferError = [
          "El valor ingresado no está dentro de las opciones",
        ];
        return await callback(
          requestCallback,
          formTextResponse(
            channels,
            "El valor ingresado no está dentro de las opciones ❗️"
          ),
          buildContext(requestContext || {})
        );
      }
    } else if (saveMode === "saveAmount") {
      const amountByUser = `${getUserInputFromContext(req)}`;

      prevData.value.initialContext.data.transferAmount = [amountByUser];
      requestContext.data.transferAmount = [amountByUser];
      dbSessions.update(prevData);

      lastMessage = "Por favor confirma la siguiente información";
    }
    return await callback(
      requestCallback,
      formTextResponse(channels, lastMessage),
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
    requestContext.data.transferError = [ex && ex.message ? ex.message : ex];
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

async function executeTransfer(req, res) {
  let requestContext = null;
  let requestCallback = null;
  try {
    const [workflowId] = getWorkflowId(req);
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
    delete requestContext.data.transferError;
    return res.sendStatus(200); // send 200 OK as soon as possible.
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
    requestContext.data.transferError = [ex && ex.message ? ex.message : ex];
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
  ListOwnAccounts,
  saveAmount,
  executeTransfer,
};
