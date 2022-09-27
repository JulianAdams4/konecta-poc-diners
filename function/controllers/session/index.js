/* eslint-disable prefer-destructuring */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable import/no-unresolved */

const crypto = require("crypto");
const base64url = require("base64url");
const nanoid = require("nanoid");
const url = require("url");

const {
  singleSelectPublicKey,
  getOauthToken,
  singleSelectCustomerBasicData,
  verifyCustomerIpBlocked,
  singleSelectTaskDevice,
  massiveSelectProductOptionsToOffer,
  decryptUsername,
} = require("Api");
const { callback } = require("Controllers/konecta");
const {
  oauthServer,
  texts,
  contextKeys,
  channels,
} = require("Utils/constants");
const {
  updateNested,
  convertObjectPropertyToArray,
  getNestedProperty,
} = require("Utils/json");

const db = require("Utils/database")("sessions.db");

const {
  buildContext,
  getStateCode,
  getVerifierCode,
  getKeyEncripted,
  getDeadlineMs,
  setPublicKey,
} = require("../_helpers");

const dbSessions = db.collection;

function buildSignInLink({ body, pendingPath, dropSession }) {
  const workflowId = nanoid();
  const responses = [
    {
      platforms: ["all"],
      responseText: dropSession
        ? texts.changedSessionExplanationText
        : texts.signinExplanationText,
      responseOptions: [
        {
          type: "url",
          text: texts.signinButtonText,
          payload: `${process.env.URL}/session/get-initialize?workflowId=${workflowId}`,
        },
      ],
    },
  ];
  const context = buildContext((body && body.context) || {});
  updateNested(context, ["data"], () => ({
    [contextKeys._pending_path]: [pendingPath],
  }));

  // Save first callback
  dbSessions.insert({
    key: workflowId,
    value: { callback: body.callback },
  });

  return callback(body.callback, responses, context);
}

async function HandleEntrypoint(req, res) {
  try {
    const urlParts = url.parse(req.url, true);
    const { query } = urlParts;
    const workflowId = query.workflowId;

    const prevData = dbSessions.findOne({ key: workflowId });
    if (!prevData || !prevData.value) {
      global.logger.error({
        message: "[1] Se perdió el workflowId",
        label: global.getLabel(__dirname, __filename),
      });
      return res
        .status(200)
        .send(
          '<script type="text/javascript">alert("Se perdió la conexión con el asistente");window.close();</script>'
        );
    }
    /*
    if (prevData.value.usedLink) {
      const expiredLinkResponseText =
        "El link para iniciar sesión ha expirado. Por favor intente nuevamente";
      await callback(
        prevData.value.callback,
        [
          {
            platforms: channels,
            responseText: expiredLinkResponseText,
          },
        ],
        buildContext({})
      );
      return res
        .status(200)
        .send('<script type="text/javascript">window.close();</script>');
    }
    */

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
      redirect_uri: `${oauthServer.oauth_redirect_uri}?workflowId=${workflowId}`, // ***
      scope: oauthServer.scope_private,
    };
    Object.keys(queryParams).forEach((key) => {
      linkValue.searchParams.append(key, queryParams[key]);
    });

    // prevData.value.usedLink = true;
    prevData.value.state = stateCode;
    prevData.value.code_challenge = challenge;
    prevData.value.code_verifier = codeVerifier;
    prevData.value.code_challenge_method = "S256";
    prevData.value.scope = oauthServer.scope_private;
    prevData.value.client_id = oauthServer.client_id_public;
    dbSessions.update(prevData);

    return res.redirect(linkValue.href);
  } catch (error) {
    global.logger.error({
      message: "[2] Ocurrió un error al crear el challenge",
      label: global.getLabel(__dirname, __filename),
    });
    return res
      .status(200)
      .send(
        '<script type="text/javascript">alert("Ocurrió un error al iniciar sesión");window.close();</script>'
      );
  }
}

async function HandleCallback(req, res) {
  let requestCallback = null;
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
        message: "[1] La URL de redireccion no tiene los parametros necesarios",
        label: global.getLabel(__dirname, __filename),
      });
      return res
        .status(200)
        .send(
          '<script type="text/javascript">alert("Falló al obtener la sesión");window.close();</script>'
        );
    }

    const workflowId = query.workflowId;
    const prevData = dbSessions.findOne({ key: workflowId });
    if (!prevData || !prevData.value) {
      global.logger.error({
        message: "[2] No hay informacion para responder",
        label: global.getLabel(__dirname, __filename),
      });
      return res
        .status(200)
        .send(
          '<script type="text/javascript">alert("Se perdió la conexión con el asistente");window.close();</script>'
        );
    }

    requestCallback = prevData.value.callback;
    if (!requestCallback) {
      global.logger.error({
        message: "[3] No hay callback para responder",
        label: global.getLabel(__dirname, __filename),
      });
      return res
        .status(200)
        .send(
          '<script type="text/javascript">alert("No fue posible responder al asistente");window.close();</script>'
        );
    }

    const prevCode = prevData.value.code;
    const prevState = prevData.value.state;
    const prevSessionState = prevData.value.session_state;

    if (!prevCode) prevData.value.code = query.code;
    if (!prevState) prevData.value.state = query.state;
    if (!prevSessionState) prevData.value.session_state = query.session_state;
    dbSessions.update(prevData);

    // Close window here?

    // ********************************************
    const response1 = await singleSelectPublicKey();
    if (response1 && response1.publicKey && response1.publicKey.publicKey) {
      setPublicKey(response1.publicKey.publicKey);
    }
    // ********************************************
    let userName = "";
    let codeVerifier = "";
    if (prevData && prevData.value) {
      codeVerifier = prevData.value.code_verifier;
    }
    const response2 = await getOauthToken({
      authCode: query.code,
      stateCode: query.state,
      verifierCode: codeVerifier,
      workflowId,
    });
    if (response2.expires_in && response2.refresh_expires_in) {
      userName = decryptUsername(response2.access_token);

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
    }
    // **************************************************
    const llave_simetrica = getKeyEncripted();
    const response3 = await singleSelectCustomerBasicData({
      access_token: response2.access_token,
      id_token: response2.id_token,
      llave_simetrica,
      userName,
    });
    if (response3 && response3.customer && response3.customer.isExpiredUser) {
      if (prevData) {
        dbSessions.remove(prevData);
      }
      const expiredUserText =
        "Hubo un error con el usuario ingresado. Contacta al administrador";
      return await callback(
        requestCallback,
        [
          {
            platforms: channels,
            responseText: expiredUserText,
          },
        ],
        buildContext({})
      );
    }
    const name = response3.customer.firstName1 || "";
    const lastname = response3.customer.lastName1 || "";
    const fullnameOrUser = `${name} ${lastname}`.trim() || userName;
    await callback(
      requestCallback,
      [
        {
          platforms: channels,
          responseText: `Bienvenido(a) ${fullnameOrUser}`,
        },
      ],
      buildContext({})
    );
    await callback(
      requestCallback,
      [
        {
          platforms: channels,
          responseText: "Procesando solicitud, por favor espere.",
        },
      ],
      buildContext({})
    );
    const customerId = response3.customer.customerId;
    // **********************************************
    const response4 = await verifyCustomerIpBlocked({
      access_token: response2.access_token,
      id_token: response2.id_token,
      userName,
    });
    const executionTransactionStatus4 = getNestedProperty(
      "dataExecutionTransaction.executionTransactionStatus",
      response4
    );
    if (executionTransactionStatus4) {
      if (`${executionTransactionStatus4.shortDesc}` === "1") {
        if (prevData) {
          dbSessions.remove(prevData);
        }
        const blockedIpText =
          "La dirección IP desde la que estás accediendo se encuentra bloqueada. Contacte al administrador.";
        return await callback(
          requestCallback,
          [
            {
              platforms: channels,
              responseText: blockedIpText,
            },
          ],
          buildContext({})
        );
      }
    }
    // *********************************************
    const deviceFp = getNestedProperty("fingerprint.hash", req);
    const response5 = await singleSelectTaskDevice({
      access_token: response2.access_token,
      id_token: response2.id_token,
      customerId,
      deviceFp,
    });
    if (response5.device) {
      global.logger.error({
        message: getNestedProperty(
          "dataExecutionTransaction.coreResultString",
          response5
        ),
        label: global.getLabel(__dirname, __filename),
      });
      if (response5.device.active === true) {
        // Call notifyPostLogin with 2
      }
    }
    // *********************************************************
    const response6 = await massiveSelectProductOptionsToOffer({
      access_token: response2.access_token,
      id_token: response2.id_token,
      customerId,
    });
    let offersResponseText = "";
    if (response6 && response6.collection) {
      const resp = convertObjectPropertyToArray(
        "collection.product",
        response6
      );
      if (resp.collection.product.length) {
        const firstLine = `Tienes ${resp.collection.product.length} oferta(s):`;
        const secondLine = resp.collection.product
          .map((prod, idx) => `  [${idx + 1}. ${prod.webTitle}] \n`)
          .join(" ");
        offersResponseText = `${firstLine}\n ${secondLine}`;
      } else {
        offersResponseText = "Por el momento no tienes ofertas de valor";
      }
    } else if (getNestedProperty("Detail.errors.error", response6)) {
      offersResponseText =
        "Ocurrió un error al obtener la información. Intente nuevamente dentro de unos minutos";
    } else {
      offersResponseText = "Ocurrió un error inesperado. Intente nuevamente.";
    }
    // const name = response3.customer.firstName1 || "";
    // const lastname = response3.customer.lastName1 || "";
    // const fullname = `${name} ${lastname}`.trim() || userName;
    // await callback(
    //   requestCallback,
    //   [
    //     {
    //       platforms: channels,
    //       responseText: `Bienvenido(a) ${fullname}`,
    //     },
    //   ],
    //   buildContext({})
    // );
    await callback(
      requestCallback,
      [
        {
          platforms: channels,
          responseText: offersResponseText,
        },
      ],
      buildContext({})
    );

    return res
      .status(200)
      .send('<script type="text/javascript">window.close();</script>');

    // -------------
  } catch (error) {
    global.logger.error({
      message: error,
      label: global.getLabel(__dirname, __filename),
    });

    if (!requestCallback) {
      global.logger.error({
        message: "[4] No hay callback para responder",
        label: global.getLabel(__dirname, __filename),
      });
      return res
        .status(200)
        .send(
          '<script type="text/javascript">alert("Ocurrio un error inesperado y se perdió la conexión");window.close();</script>'
        );
    }
    // Se puede responder
    const lastContext = buildContext({});
    await callback(
      requestCallback,
      [
        {
          platforms: channels,
          responseText:
            "Ocurrió un error al procesar tu solicitud. Lamentamos el inconveniente",
        },
      ],
      lastContext
    );
    return res
      .status(200)
      .send(
        '<script type="text/javascript">alert("Ocurrio un error");window.close();</script>'
      );
  }
}

module.exports = {
  buildSignInLink,
  HandleEntrypoint,
  HandleCallback,
};
