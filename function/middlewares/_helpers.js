const {
  publicPatters,
  oauthPatterns,
  oauthServer,
} = require("../utils/constants");
const { getFromContextData } = require("../utils/request");

const db = require("../utils/database")("sessions.db");

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
 * Valida si la ruta solicitada pertenece al flujo del OAuth2
 * @param {Object} req
 * @returns {Boolean} boolean
 */
function isOauthRoute(req) {
  // eslint-disable-next-line no-restricted-syntax
  for (const pattern of oauthPatterns) {
    if (req.originalUrl.includes(pattern)) {
      return true;
    }
  }
  return false;
}

function getOauthTimeout() {
  return oauthServer.redirect_callback_timeout_seg;
}

/**
 * Valida que tenga todos los atributos de una sesión activa y válida
 * @param {Object} req
 * @returns {Boolean} boolean
 */
function hasNoSession(req) {
  const flowIdentifier = getFromContextData(req, "workflowId");
  if (!flowIdentifier) return true;
  const prevData = dbSessions.findOne({ key: flowIdentifier });
  if (!prevData || !prevData.value) return true;
  return false;
}

/**
 * Valida que no se hayan alterado o cambiado los atributos de la sesión
 * @param {Object} req
 * @returns {Boolean} boolean
 */
function hasChangedState(req) {
  const flowIdentifier = getFromContextData(req, "workflowId");
  const prevData = dbSessions.findOne({ key: flowIdentifier });

  let wasModified = { check: false, origin: "" };
  const reqAccessToken = prevData.value.access_token;
  if (!reqAccessToken || typeof reqAccessToken !== "string") {
    wasModified = { check: true, origin: "access_token" };
  }
  const reqState = prevData.value.state;
  if (!reqState || typeof reqState !== "string") {
    wasModified = { check: true, origin: "state" };
  }
  const reqSessionState = prevData.value.session_state;
  if (!reqSessionState || typeof reqSessionState !== "string") {
    wasModified = { check: true, origin: "session_state" };
  }
  const reqCode = prevData.value.code;
  if (!reqCode || typeof reqCode !== "string") {
    wasModified = { check: true, origin: "code" };
  }
  const reqTokenExpiration = prevData.value.expires_in;
  if (!reqTokenExpiration || typeof reqTokenExpiration !== "string") {
    wasModified = { check: true, origin: "expires_in" };
  }
  const reqTokenDeadline = prevData.value.deadline;
  if (!reqTokenDeadline || typeof reqTokenDeadline !== "string") {
    wasModified = { check: true, origin: "deadline" };
  }
  if (wasModified.check) {
    global.logger.error({
      message: [
        `Se intentó acceder a "${req.baseUrl}" con un error en la sesión`,
        `El campo erróneo es [${wasModified.origin}: ${
          prevData.value[wasModified.origin]
        }]`,
      ].join("\n"),
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
  const flowIdentifier = getFromContextData(req, "workflowId");
  const prevData = dbSessions.findOne({ key: flowIdentifier });

  const reqTokenDeadline = prevData.value.deadline;
  // eslint-disable-next-line radix
  const parsedDeadline = parseInt(`${reqTokenDeadline}`);
  return parsedDeadline > Date.now();
}

module.exports = {
  isPublicRoute,
  isOauthRoute,
  getOauthTimeout,
  hasChangedState,
  hasNoSession,
  hasExpiredSession,
};
