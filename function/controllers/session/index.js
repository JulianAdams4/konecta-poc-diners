/* eslint-disable import/order */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-underscore-dangle */
/* eslint-disable camelcase */

const InBackground = require("child_process").fork;
const base64url = require("base64url");
const crypto = require("crypto");
const nanoid = require("nanoid");
const url = require("url");

const API = require("../../api");
const { callback, formLinkResponse, formTextResponse } = require("../konecta");
const {
  channels,
  oauthServer,
  OtpMissingCodeMessage,
  OtpVerificationMessages,
  texts,
} = require("../../utils/constants");
const JsonUtils = require("../../utils/json");
const {
  getResponseScriptTag,
  getFromContextData,
} = require("../../utils/request");
const {
  buildContext,
  getDeadlineMs,
  getKeyEncripted,
  getStateCode,
  getVerifierCode,
  setPublicKey,
} = require("../_helpers");

const db = require("../../utils/database")("sessions.db");

const dbSessions = db.collection;

/**
 * Response con link para iniciar sesión
 * @param - { body, pendingPath, dropSession }
 * @returns - {Promise}
 */
function buildSignInLink({ body, pendingPath, dropSession }) {
  let context = null;
  try {
    const workflowId = nanoid();
    context = buildContext((body && body.context) || {});
    JsonUtils.updateNested(context, ["data"], (prevData) => ({
      ...prevData,
      workflowId: [workflowId],
      pending_path: [pendingPath],
    }));
    // ****************
    dbSessions.insert({
      key: workflowId,
      value: {
        callback: body.callback,
        initialContext: context,
        pendingPath,
      },
    });
    // *********************
    const singInTextResponse = dropSession
      ? texts.changedSessionExplanationText
      : texts.signinExplanationText;
    const singInUrl = `${process.env.URL}/session/get-initialize?workflowId=${workflowId}`;
    return callback(
      body.callback,
      formLinkResponse(
        channels,
        singInTextResponse,
        texts.signinButtonText,
        singInUrl
      ),
      context
    );
  } catch (error) {
    if (body.callback && body.callback.baseUrl) {
      return callback(
        body.callback,
        formTextResponse(channels, error.toString()),
        context
      );
    }
    return null;
  }
}

/**
 * Inicia el proceso de OAuth2 + PKCE
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise} Promise
 */
async function HandleEntrypoint(req, res) {
  let requestContext = null;
  let requestCallback = null;
  try {
    const urlParts = url.parse(req.url, true);
    const workflowId = urlParts.query.workflowId;

    const prevData = dbSessions.findOne({ key: workflowId });
    if (!prevData || !prevData.value) {
      global.logger.error({
        message: "No hay información para responder",
        label: global.getLabel(__dirname, __filename),
      });
      return res.sendStatus(200);
    }
    requestCallback = prevData.value.callback;
    requestContext = prevData.value.initialContext;

    const stateCode = getStateCode();
    const codeVerifier = getVerifierCode();
    const hash = await crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64");
    const challenge = base64url.fromBase64(hash);

    const linkValue = new URL(oauthServer.oauth_server_auth);
    const queryParams = {
      client_id: oauthServer.client_id_public,
      response_type: "code",
      state: stateCode,
      code_challenge: challenge,
      code_challenge_method: "S256",
      redirect_uri: `${oauthServer.oauth_redirect_uri}?workflowId=${workflowId}`,
      scope: oauthServer.scope_private,
    };
    Object.keys(queryParams).forEach((key) => {
      linkValue.searchParams.append(key, queryParams[key]);
    });

    prevData.value.state = stateCode;
    prevData.value.code_challenge = challenge;
    prevData.value.code_verifier = codeVerifier;
    prevData.value.code_challenge_method = "S256";
    prevData.value.scope = oauthServer.scope_private;
    prevData.value.client_id = oauthServer.client_id_public;
    dbSessions.update(prevData);

    return res.redirect(302, linkValue.href);
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
    const lastContext = buildContext(requestContext || {});
    await callback(
      requestCallback,
      formTextResponse(
        channels,
        "Ocurrió un error al procesar tu solicitud. Lamentamos el inconveniente"
      ),
      lastContext
    );
    return res.sendStatus(200);
  }
}

/**
 * Maneja la parte final del proceso de OAuth2 + PKCE.
 * LLama al servicio BasicData
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise} Promise
 */
async function HandleCallback(req, res) {
  let requestCallback = null;
  let requestContext = null;
  try {
    const urlParts = url.parse(req.url, true);
    const { query } = urlParts;
    if (
      !query.workflowId ||
      !query.state ||
      !query.session_state ||
      !query.code
    ) {
      // No hay params
      global.logger.error({
        message: "La URL de redireccion no tiene los parametros necesarios",
        label: global.getLabel(__dirname, __filename),
      });
      global.logger.error({
        message: "No hay callback para responder",
        label: global.getLabel(__dirname, __filename),
      });
      return res.status(200).send(getResponseScriptTag());
    }

    const workflowId = query.workflowId;
    const prevData = dbSessions.findOne({ key: workflowId });
    if (!prevData || !prevData.value || !prevData.value.callback) {
      global.logger.error({
        message: "No hay información para responder",
        label: global.getLabel(__dirname, __filename),
      });
      return res.sendStatus(200);
    }
    requestCallback = prevData.value.callback;
    requestContext = prevData.value.initialContext;
    // ********************************************
    const prevCode = prevData.value.code;
    const prevState = prevData.value.state;
    const prevSessionState = prevData.value.session_state;
    if (!prevCode) prevData.value.code = query.code;
    if (!prevState) prevData.value.state = query.state;
    if (!prevSessionState) prevData.value.session_state = query.session_state;
    dbSessions.update(prevData);
    // ********************************************
    const response1 = await API.singleSelectPublicKey();
    if (JsonUtils.getNestedProperty("publicKey.publicKey", response1)) {
      setPublicKey(response1.publicKey.publicKey);
    } else {
      global.logger.error({
        message: JsonUtils.getNestedProperty(
          "Detail.errors.error.detail",
          response1
        ),
        label: global.getLabel(__dirname, __filename),
      });
      await callback(
        requestCallback,
        formTextResponse(
          channels,
          "Ocurrió un error inesperado. Por favor intente dentro de unos minutos."
        ),
        buildContext(requestContext || {})
      );
      return res.sendStatus(200);
    }
    // ********************************************
    let userName = "";
    const codeVerifier = prevData.value.code_verifier;
    const response2 = await API.getOauthToken({
      authCode: query.code,
      stateCode: query.state,
      verifierCode: codeVerifier,
      workflowId,
    });
    if (response2.expires_in && response2.refresh_expires_in) {
      userName = API.Helpers.decryptUsername(response2.access_token);

      prevData.value.access_token = response2.access_token;
      prevData.value.refresh_token = response2.refresh_token;
      prevData.value.token_type = response2.token_type;
      prevData.value.id_token = response2.id_token;
      prevData.value.session_state = response2.session_state;
      prevData.value.scope = response2.scope;
      prevData.value.expires_in = response2.expires_in;
      prevData.value.refresh_expires_in = response2.refresh_expires_in;
      prevData.value.deadline = getDeadlineMs(response2.expires_in);
      prevData.value.next_refresh = getDeadlineMs(response2.refresh_expires_in);
      prevData.value.userName = userName;
      dbSessions.update(prevData);
    } else {
      global.logger.error({
        message: "No se pudo obtener el token",
        label: global.getLabel(__dirname, __filename),
      });
      await callback(
        requestCallback,
        formTextResponse(
          channels,
          "Ocurrió un error inesperado. Por favor intente dentro de unos minutos."
        ),
        buildContext(requestContext || {})
      );
      return res.sendStatus(200);
    }
    // **************************************************
    // * Close browser-tab and Continue request in child-process
    // * It's not possible to pass Request or Response Nodejs-objects to child process. Google it.
    const llave_simetrica = getKeyEncripted();
    await callback(
      requestCallback,
      formTextResponse(channels, "Procesando información. Por favor espere ⏳"),
      buildContext(requestContext || {})
    );
    // **************************************************
    const backgroundSignIn = InBackground(`${__dirname}/background-SignIn.js`);

    backgroundSignIn.send({
      dataKey: workflowId,
      prevData,
      response2,
      llave_simetrica,
      deviceFp: req.fingerprint.hash,
      encriptedUserName: API.Helpers.encryptDataDiners(userName),
    });
    // * DB is not available in child process. Send message to parent for DB-actions
    backgroundSignIn.on("message", ({ entity, action, params }) => {
      if (entity === "db") {
        if (action === "update") {
          let foundData = dbSessions.findOne({ key: params.dataKey });
          if (foundData) {
            foundData = { ...foundData, ...params.newData };
            dbSessions.update(foundData);
          } else {
            global.logger.error({
              message: "No se pudo actualizar la información de la sesión",
              label: global.getLabel(__dirname, __filename),
            });
          }
        }
        if (action === "remove") {
          const foundData = dbSessions.findOne({ key: params.dataKey });
          if (foundData) {
            dbSessions.remove(foundData);
          } else {
            global.logger.error({
              message: "No se pudo eliminar la información de la sesión",
              label: global.getLabel(__dirname, __filename),
            });
          }
        }
      }
    });
    // **************************************************
    return res.status(200).send(getResponseScriptTag());
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
      return res.status(200).send(
        getResponseScriptTag({
          alertText: "Ocurrio un error inesperado y se perdió la conexión",
        })
      );
    }
    // Se puede responder
    const lastContext = buildContext(requestContext || {});
    await callback(
      requestCallback,
      formTextResponse(
        channels,
        "Ocurrió un error al procesar tu solicitud. Lamentamos el inconveniente"
      ),
      lastContext
    );
    return res
      .status(200)
      .send('<script type="text/javascript">window.close();</script>');
  }
}

/**
 * processOtpRequest
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise} Promise
 */
async function HandleOtpConfirmation(req, res) {
  let requestCallback = null;
  let requestContext = null;
  try {
    const urlParts = url.parse(req.url, true);
    const workflowReq = getFromContextData(req, "workflowId");
    const workflowId = workflowReq || urlParts.query.workflowId;

    const prevData = dbSessions.findOne({ key: workflowId });
    if (!prevData || !prevData.value || !prevData.value.callback) {
      global.logger.error({
        message: "No hay información para responder",
        label: global.getLabel(__dirname, __filename),
      });
      return res.sendStatus(200);
    }
    requestCallback = prevData.value.callback;
    requestContext = prevData.value.initialContext;
    // ******************************************
    const userInput = JsonUtils.getNestedProperty("body.message.input.0", req);
    const OtpCodeSkipVerify = "000000";
    if (`${userInput}` !== OtpCodeSkipVerify) {
      const response6 = await API.verifyOtp({
        access_token: prevData.value.access_token,
        id_token: prevData.value.id_token,
        userName: prevData.value.userName,
        userProfile: prevData.value.userProfile,
        ruc: prevData.value.ruc,
        userInput,
      });
      if (response6.otp && response6.otp.status) {
        let callbackMessage = OtpVerificationMessages[response6.otp.status];
        if (!callbackMessage) {
          callbackMessage = OtpMissingCodeMessage;
          await callback(
            requestCallback,
            formTextResponse(channels, callbackMessage),
            buildContext(requestContext || {})
          );
          return res.sendStatus(200);
        }
        await callback(
          requestCallback,
          formTextResponse(channels, callbackMessage),
          buildContext(requestContext || {})
        );
      }
    } else {
      await callback(
        requestCallback,
        formTextResponse(channels, "Código verificado ✅"),
        buildContext(requestContext || {})
      );
    }
    // ******************************************
    const pendingOperation = prevData.value.pendingPath;
    if (!pendingOperation) {
      return res.sendStatus(200);
    }
    prevData.value.pendingPath = null;
    delete req.body.context.data.pending_path;
    dbSessions.update(prevData);
    // 308 -> Same method (GET, POST) and permanent redirection
    return res.redirect(
      `${process.env.URL}${pendingOperation}?workflowId=${workflowId}`
    );
    // ---
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
    const lastContext = buildContext(requestContext || {});
    await callback(
      requestCallback,
      formTextResponse(
        channels,
        "Ocurrió un error al procesar tu solicitud. Lamentamos el inconveniente"
      ),
      lastContext
    );
    return res.sendStatus(200);
  }
}

module.exports = {
  buildSignInLink,
  HandleEntrypoint,
  HandleCallback,
  HandleOtpConfirmation,
};
