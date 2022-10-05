/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
/* eslint-disable no-else-return */

// Note: This function updates original object
const deeplyConvertToArray = (path, obj) => {
  const properties = Array.isArray(path) ? path : path.split(".");
  if (properties.length > 1) {
    // Simple-string case. Stop recursion
    const isStringValue = typeof obj[properties[0]] === "string";
    if (!obj[properties[0]] || isStringValue) {
      return obj;
    }
    // Nested-array case. Search/Update in all subitems
    const isNestedArray = Array.isArray(obj[properties[0]]);
    if (isNestedArray) {
      for (let idx = 0; idx < obj[properties[0]].length; idx++) {
        const item = obj[properties[0]][idx];
        deeplyConvertToArray(properties.slice(1), item);
        obj[properties[0]][idx] = item;
      }
      return obj;
    }
    // Nested-object case. Recursion
    return deeplyConvertToArray(properties.slice(1), obj[properties[0]]);
  } else {
    if (obj[properties[0]]) {
      obj[properties[0]] = Array.isArray(obj[properties[0]])
        ? obj[properties[0]]
        : [obj[properties[0]]];
    }
    return true;
  }
};

const convertObjectPropertyToArray = (propertyPath, obj, makeCopy = true) => {
  if (!propertyPath || !obj) {
    return obj;
  }
  if (typeof propertyPath !== "string" || typeof obj !== "object") {
    return obj;
  }
  const objCpy = makeCopy ? { ...obj } : obj;
  deeplyConvertToArray(propertyPath, objCpy);
  return objCpy;
};

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    // eslint-disable-next-line consistent-return
    return value;
  };
};

function getNestedProperty(path, obj, separator = ".") {
  const properties = Array.isArray(path) ? path : path.split(separator);
  return properties.reduce(
    (prev, curr) => (prev ? prev[curr] : undefined),
    obj
  );
}

function update(obj, key, modify) {
  if (obj[key]) {
    const newValue = modify(obj[key]);
    obj[key] = newValue;
  }
  return obj;
}

function updateNested(object, keys, modify) {
  if (keys.length === 0) return modify(object);
  const [head, ...tail] = keys;
  return update(object, head, (value) => updateNested(value, tail, modify));
}

function getFunctionName() {
  return new Error().stack.match(/at (\S+)/g)[1].slice(3);
}

module.exports = {
  convertObjectPropertyToArray,
  getCircularReplacer,
  getNestedProperty,
  updateNested,
  getFunctionName,
};
