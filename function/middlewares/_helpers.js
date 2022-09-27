/* eslint-disable camelcase */
/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-unresolved */
const { publicPatters, contextKeys } = require("Utils/constants");
const { parseReqParams, getFromContextData } = require("Utils/request");

const db = require("Utils/database")("sessions.db");

const dbSessions = db.collection;

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
 * Valida que tenga todos los atributos de una sesión activa y válida
 * @param {Object} req
 * @returns {Boolean} boolean
 */
function hasNoSession(req) {
  const prevData = dbSessions.findOne({
    key: getFromContextData(req, contextKeys.state),
  });
  if (!prevData || !prevData.value) {
    return true;
  }
  const reqAccessToken = prevData.value.access_token;
  if (!reqAccessToken || typeof reqAccessToken !== "string") {
    return true;
  }
  const reqState = prevData.value.state;
  if (!reqState || typeof reqState !== "string") {
    return true;
  }
  const reqSessionState = prevData.value.session_state;
  if (!reqSessionState || typeof reqSessionState !== "string") {
    return true;
  }
  const reqCode = prevData.value.code;
  if (!reqCode || typeof reqCode !== "string") {
    return true;
  }
  const reqTokenExpiration = prevData.value.expires_in;
  if (!reqTokenExpiration || typeof reqTokenExpiration !== "string") {
    return true;
  }
  const reqTokenDeadline = prevData.value.deadline;
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
function hasChangedState(req) {
  const query = parseReqParams(req);
  const stateFromQuery = query.state;
  const stateFromContext = getFromContextData(req, contextKeys.state);
  const state = stateFromQuery || stateFromContext;
  if (!state) return true;

  const sessionStateFromQuery = query.session_state;
  const sessionStateFromContext = getFromContextData(
    req,
    contextKeys.session_state
  );
  const session_state = sessionStateFromQuery || sessionStateFromContext;
  if (!session_state) return true;

  const prevData = dbSessions.findOne({ key: state });
  if (!prevData || !prevData.value) return true;

  if (
    state !== prevData.value.state ||
    session_state !== prevData.value.session_state
  ) {
    global.logger.error({
      message: {
        baseUrl: req.baseUrl,
        message: "Ha cambiado la sesion",
        state: { prev: prevData.value.state, new: state },
        session_state: {
          prev: prevData.value.session_state,
          new: session_state,
        },
      },
      label: global.getLabel(__dirname, __filename),
    });
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
  const query = parseReqParams(req);
  const stateFromQuery = query.state;
  const stateFromContext = getFromContextData(req, contextKeys.state);
  const state = stateFromQuery || stateFromContext;
  if (!state) return true;

  const prevData = dbSessions.findOne({ key: state });
  if (!prevData || !prevData.value) return true;

  const reqTokenDeadline = prevData.value.deadline;
  // eslint-disable-next-line radix
  const parsedDeadline = parseInt(`${reqTokenDeadline}`);
  return parsedDeadline > Date.now();
}

module.exports = {
  isPublicRoute,
  hasChangedState,
  hasNoSession,
  hasExpiredSession,
};
