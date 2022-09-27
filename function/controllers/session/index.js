/* eslint-disable no-underscore-dangle */
/* eslint-disable no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable import/no-unresolved */

const crypto = require("crypto");
const base64url = require("base64url");
const url = require("url");

const {
  singleSelectPublicKey,
  getOauthToken,
  singleSelectCustomerBasicData,
  verifyCustomerIpBlocked,
  singleSelectTaskDevice,
} = require("Api");
const { callback } = require("Controllers/konecta");
const { oauthServer, texts, contextKeys } = require("Utils/constants");
const { updateNested } = require("Utils/json");
const { saveInContextData, getFromContextData } = require("Utils/request");

const {
  buildContext,
  getStateCode,
  getVerifierCode,
  saveOauthTokenResponse,
  getKeyEncripted,
  // parseCookies,
} = require("../_helpers");

function buildSignInLink({ body, pendingPath, dropSession }) {
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
          payload: `${process.env.URL}/session/get-initialize`,
        },
      ],
    },
  ];
  const context = buildContext((body && body.context) || {});
  updateNested(context, ["data"], () => ({
    [contextKeys._pending_path]: pendingPath,
  }));
  // context.data = { pendingPath: [pendingPath] };
  return callback(body.callback, responses, context);
}

async function HandleEntrypoint(req, res) {
  const stateCode = getStateCode();
  const codeVerifier = getVerifierCode();

  const hash = await crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64");
  const challenge = base64url.fromBase64(hash);

  if (req.body && req.body.context && req.body.context.data) {
    saveInContextData(req, contextKeys.state, stateCode);
    saveInContextData(req, contextKeys.code_verifier, codeVerifier);
  }

  const linkValue = new URL(oauthServer.oauth_server_auth);
  const queryParams = {
    client_id: oauthServer.client_id_public,
    response_type: "code",
    state: stateCode,
    code_challenge: challenge,
    code_challenge_method: "S256",
    redirect_uri: oauthServer.oauth_redirect_uri,
    scope: oauthServer.scope_private,
  };
  Object.keys(queryParams).forEach((key) => {
    linkValue.searchParams.append(key, queryParams[key]);
  });

  // Nota: No hay simulación de click. Redirige directamente al SignIn si el challenge es aceptado
  return res.redirect(linkValue.href);
  // return res.render("entrypoint", { href: linkValue.href });
}

// TODO: DROP THIS. Only development
// async function HandleCallbackLocal(req, res) {
//   const urlParts = url.parse(req.url, true);
//   const { query } = urlParts;
//   if (query.state && query.session_state && query.code) {
//     const cookies = parseCookies(req);
//     if (
//       !cookies[contextKeys.state] &&
//       !cookies[contextKeys.session_state] &&
//       !cookies[contextKeys.code]
//     ) {
//       res.cookie(state, query.state);
//       res.cookie(session_state, query.session_state);
//       res.cookie(code, query.code);
//       return res.redirect("/session/get-process-callback");
//     }
//     if (
//       cookies[contextKeys.state] !== query.state ||
//       cookies[contextKeys.session_state] !== query.session_state ||
//       cookies[contextKeys.code] !== query.code
//     ) {
//       return res.redirect(oauthServer.oauth_server_logout);
//     }
//     return res.redirect("/session/get-process-callback");
//   }
// }

async function HandleCallback(req, res) {
  try {
    const urlParts = url.parse(req.url, true);
    const { query } = urlParts;
    if (query.state && query.session_state && query.code) {
      if (req.body && req.body.context && req.body.context.data) {
        const reqState = getFromContextData(req, contextKeys.state);
        const reqSessionState = getFromContextData(
          req,
          contextKeys.session_state
        );
        const reqCode = getFromContextData(req, contextKeys.code);
        if (!reqState && !reqSessionState && !reqCode) {
          saveInContextData(req, contextKeys.state, query.state);
          saveInContextData(
            req,
            contextKeys.session_state,
            query.session_state
          );
          saveInContextData(req, contextKeys.code, query.code);

          const responses = [
            {
              platforms: ["all"],
              responseText: "Procesando solicitud, por favor espere...",
            },
          ];
          const context = buildContext(req.body.context);
          callback(req.body.callback, responses, context);
          // Continua ...

          const response1 = await singleSelectPublicKey();
          console.log(
            `\nsingleSelectPublicKey: ${JSON.stringify(response1)}\n`
          );

          const codeVerifier = getFromContextData(
            req,
            contextKeys.code_verifier
          );
          const response2 = await getOauthToken({
            authCode: query.code,
            stateCode: query.session_state,
            verifierCode: codeVerifier,
          });
          console.log(`\ngetOauthToken: ${JSON.stringify(response2)}\n`);
          saveOauthTokenResponse(req, response2);

          const response3 = await singleSelectCustomerBasicData({
            access_token: response2.access_token,
            id_token: response2.id_token,
            llave_simetrica: getKeyEncripted(),
          });
          console.log(
            `\nsingleSelectCustomerBasicData: ${JSON.stringify(response3)}\n`
          );
          if (response3.customer.isExpiredUser) {
            const clearedRspnss = [
              {
                platforms: ["all"],
                responseText:
                  "Hubo un error con el usuario ingresado. Contacta al administrador",
              },
            ];
            const clearedContext = buildContext({});
            return callback(req.body.callback, clearedRspnss, clearedContext);
          }
          // eslint-disable-next-line prefer-destructuring
          const customerId = response3.customer.customerId;

          const response4 = await verifyCustomerIpBlocked({
            access_token: response2.access_token,
            id_token: response2.id_token,
          });
          console.log(
            `\verifyCustomerIpBlocked: ${JSON.stringify(response4)}\n`
          );

          const response5 = await singleSelectTaskDevice({
            access_token: response2.access_token,
            id_token: response2.id_token,
            customerId,
          });
          console.log(
            `\nsingleSelectTaskDevice: ${JSON.stringify(response5)}\n`
          );

          // ---
        }
      }

      // return res.redirect("/session/get-process-callback");
      return res
        .status(200)
        .send('<script type="text/javascript">window.close();</script>');
    }
    return res.render("callback", { error: true });
  } catch (error) {
    global.logger.error({
      message: error,
      label: global.getLabel(__dirname, __filename),
    });
    return res.redirect(oauthServer.oauth_server_logout);
  }
}

module.exports = {
  buildSignInLink,
  HandleEntrypoint,
  HandleCallback,
};
