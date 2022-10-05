/* eslint-disable no-unused-vars */
/* eslint-disable prefer-destructuring */
/* eslint-disable camelcase */
const base64url = require("base64url");
const crypto = require("crypto");
const nanoid = require("nanoid");
const url = require("url");

const API = require("../../api");
const { callback, formTextResponse } = require("../konecta");
const { channels } = require("../../utils/constants");
const JsonUtils = require("../../utils/json");
const { buildContext } = require("../_helpers");

// const db = require("../../utils/database")("sessions.db");
// const dbSessions = db.collection;

process.on("message", async (props) => {
  const {
    dataKey,
    deviceFp,
    encriptedUserName,
    llave_simetrica,
    prevData,
    response2,
  } = props;

  if (!prevData || !prevData.value || !prevData.value.callback) {
    console.error(
      `[Error in ${__dirname}] \nNo hay información para responder`
    );
    return process.exit(1);
  }

  const requestCallback = prevData.value.callback;
  const requestContext = prevData.value.initialContext;
  const userName = prevData.value.userName;

  const response3 = await API.singleSelectCustomerBasicData({
    access_token: response2.access_token,
    id_token: response2.id_token,
    llave_simetrica,
    encriptedUserName,
  });
  // Error de servicio
  if (!JsonUtils.getNestedProperty("customer", response3)) {
    await callback(
      requestCallback,
      formTextResponse(
        channels,
        "Ocurrió un error inesperado. Por favor intente dentro de unos minutos."
      ),
      buildContext(requestContext || {})
    );
    console.error(
      [
        `[Error in ${__dirname}]`,
        `${response3.Detail.errors.error.detail}`,
      ].join("\n")
    );
    return process.exit(1);
  }
  // Error en data del usuario
  if (response3.customer.isExpiredUser) {
    await callback(
      requestCallback,
      formTextResponse(
        channels,
        [
          "El usuario ingresado no se encuentra disponible actualmente ⛔️",
          "Verifique los datos e intente nuevamente 🔄",
        ].join("\n")
      ),
      buildContext(requestContext || {})
    );
    if (prevData) {
      process.send({ action: "remove", entity: "db", params: { dataKey } });
      // dbSessions.remove(prevData);
    }
    console.error(
      [
        `[Error in ${__dirname}]`,
        `El usuario tiene activo el flag isExpiredUser`,
      ].join("\n")
    );
    return process.exit(1);
  }
  if (!response3.customer.firstName1 && !response3.customer.lastName1) {
    await callback(
      requestCallback,
      formTextResponse(
        channels,
        "Ocurrió un error inesperado. Por favor intente dentro de unos minutos."
      ),
      buildContext(requestContext || {})
    );
    console.error(
      [
        `[Error in ${__dirname}]`,
        "No tiene nombre ni apellido. Data mal formada.",
      ].join("\n")
    );
    return process.exit(1);
  }
  // *********************************************
  const name = response3.customer.firstName1 || "";
  const lastname = response3.customer.lastName1 || "";
  const fullname = `${name} ${lastname}`.trim();
  await callback(
    requestCallback,
    formTextResponse(channels, `Bienvenido(a) ${fullname || userName} 👋`),
    buildContext(requestContext || {})
  );

  // prevData.value.firstName1 = name;
  // prevData.value.lastName1 = lastname;
  // prevData.value.fullname = fullname;
  // prevData.value.customerId = response3.customer.customerId;
  // prevData.value.userProfile = response3.customer.userProfile;
  // prevData.value.ruc = response3.customer.identification.idNumber;
  // dbSessions.update(prevData);
  process.send({
    action: "update",
    entity: "db",
    params: {
      dataKey,
      newData: {
        fullname,
        firstName1: name,
        lastName1: lastname,
        customerId: response3.customer.customerId,
        userProfile: response3.customer.userProfile,
        ruc: response3.customer.identification.idNumber,
      },
    },
  });
  // dbSessions.remove(prevData);
  await callback(
    requestCallback,
    formTextResponse(
      channels,
      "Procesando solicitud. Por favor espere unos momentos ⏳"
    ),
    buildContext(requestContext || {})
  );
  // *************************************
  const id_token = prevData.value.id_token;
  const access_token = prevData.value.access_token;

  const customerId = response3.customer.customerId;

  const response4 = await API.verifyCustomerIpBlocked({
    access_token,
    id_token,
    userName,
  });
  const executionTransactionStatus4 = JsonUtils.getNestedProperty(
    "dataExecutionTransaction.executionTransactionStatus",
    response4
  );
  if (executionTransactionStatus4) {
    if (`${executionTransactionStatus4.shortDesc}` === "1") {
      await callback(
        requestCallback,
        formTextResponse(
          channels,
          "La dirección IP desde la que estás accediendo se encuentra bloqueada ⛔️"
        ),
        buildContext(requestContext || {})
      );
      if (prevData) {
        process.send({ action: "remove", entity: "db", params: { dataKey } });
        // dbSessions.remove(prevData);
      }
      console.error(
        [
          `[Error in ${__dirname}]`,
          "La dirección IP desde la que estás accediendo se encuentra bloqueada",
        ].join("\n")
      );
      return process.exit(1);
    }
  }
  // *********************************************
  const response5 = await API.singleSelectTaskDevice({
    access_token,
    customerId,
    id_token,
    deviceFp,
  });
  if (response5.device) {
    if (response5.device.active === true) {
      // Call notifyPostLogin with 2
    }
  }
  // *********************************************
  const response6 = await API.processOtpRequest({
    id_token: prevData.value.id_token,
    userName: prevData.value.userName,
    access_token: prevData.value.access_token, // ...
    customerId: response3.customer.customerId,
    ruc: response3.customer.identification.idNumber,
    userProfile: response3.customer.userProfile,
  });
  let otpResponseText = "";
  if (response6.otp && response6.otp.status === 0) {
    otpResponseText = [
      "Se envió una clave temporal al celular 📱 y correo electrónico 📧 registrados",
      "La clave expira en 5 minutos ⏳",
      "Si no la recibes, comunícate al 📞 (02)2984-400",
    ].join("\n");
  } else {
    otpResponseText = [
      "Ocurrió un error al enviar el código OTP ❗️",
      "Por favor intente más tarde",
    ].join("\n");
  }
  await callback(
    requestCallback,
    formTextResponse(channels, otpResponseText),
    buildContext(requestContext || {})
  );

  return process.exit(0);
});
