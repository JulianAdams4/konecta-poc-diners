/* eslint-disable import/no-unresolved */
/* eslint-disable no-underscore-dangle */

const axios = require("axios");
const { getCircularReplacer } = require("Utils/json");

/**
 * It sends a response to the user
 */
async function callback(
  _params,
  responses,
  context,
  takeover,
  first,
  nextEvents
) {
  const params = _params || {};

  if (!params || !Object.keys(params).length) return null;

  const options = {
    method: "POST",
    url: `${params.baseUrl}/conversation/callback/${params._id}?token=${params.token}`,
    headers: {
      channel: "kon",
      "Content-type": "application/json",
    },
    data: {
      responses,
      context,
      takeover,
      first,
      nextEvents,
    },
  };

  let responseCall = {};
  try {
    responseCall = await axios(options);
    global.logger.info({
      message: {
        function: "Callback-To-Bot",
        options: JSON.stringify(options, getCircularReplacer()),
        status: responseCall.status,
        data: responseCall.data,
        error: null,
      },
      label: global.getLabel(__dirname, __filename),
    });
  } catch (ex) {
    // global.Sentry.captureException(ex);
    global.logger.error({
      message: {
        function: "Callback-To-Bot",
        options: JSON.stringify(options, getCircularReplacer()),
        status: responseCall.status || 500,
        data: null,
        error: ex,
      },
      label: global.getLabel(__dirname, __filename),
    });
  }

  return null;
}

module.exports = { callback };
