/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-unresolved */
const { publicPatters, contextKeys } = require("Utils/constants");
const { parseReqParams, getFromContextData } = require("Utils/request");

/**
 * Valida si la ruta solicitada es pública para saltear las demás validaciones
 * @param {Object} req
 * @returns {Boolean} boolean
 */
function isPublicRoute(req) {
  // eslint-disable-next-line no-restricted-syntax
  for (const pattern of publicPatters) {
    if (req.originalUrl.includes(pattern)) {
      return true;
    }
  }
  return false;
}

/**
 * Valida que no se hayan alterado o cambiado los atributos de la sesión
 * @param {Object} req
 * @returns {Boolean} boolean
 */
function hasChangedState(req) {
  if (req.body && req.body.context && req.body.context.data) {
    const query = parseReqParams(req);
    const prevStateCode = getFromContextData(req, contextKeys.state);
    const prevSessionStateCode = getFromContextData(
      req,
      contextKeys.session_state
    );
    const prevCode = getFromContextData(req, contextKeys.code);
    if (
      prevStateCode !== query.state ||
      prevSessionStateCode !== query.session_state ||
      prevCode !== query.code
    ) {
      global.logger.error({
        message: {
          baseUrl: req.baseUrl,
          message: "Ha cambiado la sesion",
          state: { prev: prevStateCode, new: query.state },
          session_state: {
            prev: prevSessionStateCode,
            new: query.session_state,
          },
          code: { prev: prevCode, new: query.code },
        },
        label: global.getLabel(__dirname, __filename),
      });
      return true;
    }
  }
  return false;
}

/**
 * Valida que tenga todos los atributos de una sesión activa y válida
 * @param {Object} req
 * @returns {Boolean} boolean
 */
function hasNoSession(req) {
  const reqAccessToken = getFromContextData(req, contextKeys.access_token);
  if (!reqAccessToken || typeof reqAccessToken !== "string") {
    return true;
  }
  const reqState = getFromContextData(req, contextKeys.state);
  if (!reqState || typeof reqState !== "string") {
    return true;
  }
  const reqSessionState = getFromContextData(req, contextKeys.session_state);
  if (!reqSessionState || typeof reqSessionState !== "string") {
    return true;
  }
  const reqCode = getFromContextData(req, contextKeys.code);
  if (!reqCode || typeof reqCode !== "string") {
    return true;
  }
  const reqTokenExpiration = getFromContextData(req, contextKeys.expires_in);
  if (!reqTokenExpiration || typeof reqTokenExpiration !== "string") {
    return true;
  }
  const reqTokenDeadline = getFromContextData(req, contextKeys._deadline);
  if (!reqTokenDeadline || typeof reqTokenDeadline !== "string") {
    return true;
  }
  return false;
}

/**
 * Valida que no se hayan alterado o cambiado los atributos de la sesión
 * @param {Object} req
 * @returns {Boolean} boolean
 */
function hasExpiredSession(req) {
  const reqTokenDeadline = getFromContextData(req, contextKeys._deadline);
  // eslint-disable-next-line radix
  const parsedDeadline = parseInt(reqTokenDeadline);
  return parsedDeadline > Date.now();
}

module.exports = {
  isPublicRoute,
  hasChangedState,
  hasNoSession,
  hasExpiredSession,
};
