/* eslint-disable camelcase */
/* eslint-disable dot-notation */
const url = require("url");
const {
  publicPatters,
  oauthPatterns,
  oauthServer,
  default_timeout,
} = require("../utils/constants");
const { getFromContextData } = require("../utils/request");

const dbSessions = require("../utils/database");

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

function getDefaultTimeout() {
  return default_timeout;
}

function logPublicRoute(req) {
  console.warn("-----------------");
  console.warn("[Public Route]:  ", req.originalUrl);
  console.warn("   Method:       ", req.method);
  console.warn("   BodyCallback: ", JSON.stringify(req.body.callback || {}));
  console.warn("   BodyContext:  ", JSON.stringify(req.body.context || {}));
  console.warn("-----------------");
}

function logProtectedRoute(req) {
  console.log("-------------------");
  console.log("[Protected Route]: ", req.originalUrl);
  console.log("   Method:         ", req.method);
  console.log("   BodyCallback:   ", JSON.stringify(req.body.callback || {}));
  console.log("   BodyContext:    ", JSON.stringify(req.body.context || {}));
  console.log("-------------------");
}

/**
 * Valida que tenga todos los atributos de una sesión activa y válida
 * @param {Object} req
 * @returns {Boolean} boolean
 */
function hasNoSession(req) {
  const urlParts = url.parse(req.url, true);
  const queryWorkflowId = urlParts.query.workflowId;
  const contextWorkflowId = getFromContextData(req, "workflowId");
  const workflowId = contextWorkflowId || queryWorkflowId;
  if (!workflowId) return true;
  const prevData = dbSessions.findOne({ key: workflowId });
  if (!prevData || !prevData.value) return true;
  // Only if exists wId in DB
  if (!contextWorkflowId && queryWorkflowId) {
    if (!req.body) req.body = {};
    req.body.callback = { ...prevData.value.callback };

    if (!req.body.context) req.body.context = {};
    if (!req.body.context.data) req.body.context.data = {};
    req.body.context.data.workflowId = [workflowId];
  }
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
  if (!reqTokenExpiration) {
    wasModified = { check: true, origin: "expires_in" };
  }
  const reqTokenDeadline = prevData.value.deadline;
  if (!reqTokenDeadline) {
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
  const rightNow = Date.now();
  if (rightNow > parsedDeadline) {
    global.logger.error({
      message: `La sesión ha expirado | Deadline: ${parsedDeadline} | Now: ${rightNow}`,
      label: global.getLabel(__dirname, __filename),
    });
    return true;
  }
  return rightNow > parsedDeadline;
}

module.exports = {
  getDefaultTimeout,
  getOauthTimeout,
  hasChangedState,
  hasExpiredSession,
  hasNoSession,
  isOauthRoute,
  isPublicRoute,
  logProtectedRoute,
  logPublicRoute,
};
