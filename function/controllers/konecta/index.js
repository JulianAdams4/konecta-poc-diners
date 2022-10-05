/* eslint-disable no-underscore-dangle */

const axios = require("axios");
const { getCircularReplacer: replacer } = require("../../utils/json");

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
    console.log("[Callback-To-Bot]");
    console.log("   Options: ", JSON.stringify(options, replacer()));
    console.log("   Status: ", responseCall.status);
    console.log("   Data: ", JSON.stringify(responseCall.data));
    console.log("   Error: NULL");
  } catch (error) {
    // global.Sentry.captureException(ex);
    console.error("[Callback-To-Bot]");
    console.error("   Options: ", JSON.stringify(options, replacer()));
    console.error("   Status: ", responseCall.status || 500);
    console.error("   Data: NULL");
    console.error("   Error: ", error.toString());
  }
  return null;
}

function formLinkResponse(channels, description, linkText, linkUrl) {
  return [
    {
      platforms: channels,
      responseText: description,
      responseOptions: [
        {
          type: "url",
          text: linkText,
          payload: linkUrl,
        },
      ],
    },
  ];
}

function formTextResponse(platforms, responseText) {
  return [{ platforms, responseText }];
}

module.exports = { callback, formLinkResponse, formTextResponse };
