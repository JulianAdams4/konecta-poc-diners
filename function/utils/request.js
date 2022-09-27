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
  updateNested(req, keys, () => [value]);
}

/**
 * Obtene un valor de una propiedad anidada si existe en un objeto o arreglo
 * @param {*} path
 * @param {*} obj
 * @param {*} separator
 * @returns {*} value or undefined
 */
function getFromContextData(req, key) {
  const path = `body.context.data.${key}.0`;
  return getNestedProperty(path, req);
}

module.exports = { parseReqParams, saveInContextData, getFromContextData };
