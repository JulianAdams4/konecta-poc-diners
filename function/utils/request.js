const url = require("url");
const { getNestedProperty, updateNested } = require("./json");

function parseReqParams(req) {
  const urlParts = url.parse(req.url, true);
  const { query } = urlParts;
  return query;
}

/**
 * Actualiza el valor de una propiedad anidada si existe en un objeto o arreglo
 * @param {*} input - Objeto a modificar
 * @param {*} path - Path a la propiedad anidada
 * @param {*} separator (opcional) - Separador del path
 * @returns {*} void
 */
function saveInContextData(req, key, value) {
  const keys = `body.context.data.${key}`.split(".");
  if (getNestedProperty(keys, req)) {
    // Si existe la actualiza
    updateNested(req, keys, () => [value]);
  } else {
    // Si no existe la crea
    updateNested(req, ["body", "context", "data"], (prevData) => ({
      ...prevData,
      [key]: [value],
    }));
  }
}

/**
 * Obtene un valor de una propiedad anidada si existe en un objeto o arreglo
 * @param {*} path
 * @param {*} obj
 * @param {*} separator
 * @returns {*} value or undefined
 */
function getFromContextData(req, key, skipFirstIndex = false) {
  const path = `body.context.data.${key}${skipFirstIndex ? "" : ".0"}`;
  return getNestedProperty(path, req);
}

function getUserInputFromContext(req, skipFirstIndex = false) {
  const path = `body.message.input${skipFirstIndex ? "" : ".0"}`;
  return getNestedProperty(path, req);
}

function getResponseScriptTag(params) {
  const { alertText, withClose = true } = params || {};
  let tagContent = "";
  if (alertText) tagContent = `alert("${alertText}");`;
  if (withClose) tagContent = `${tagContent}window.close();`;
  return `<script type="text/javascript">${tagContent}</script>`;
}

module.exports = {
  parseReqParams,
  saveInContextData,
  getFromContextData,
  getResponseScriptTag,
  getUserInputFromContext,
};
