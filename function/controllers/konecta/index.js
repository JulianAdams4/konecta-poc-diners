/* eslint-disable no-nested-ternary */
/* eslint-disable no-underscore-dangle */

const url = require("url");
const axios = require("axios");
const { getCircularReplacer: replacer } = require("../../utils/json");
const { getFromContextData } = require("../../utils/request");

function getWorkflowId(req) {
  const urlParts = url.parse(req.url, true);
  const queryWorkflowId = urlParts.query.workflowId;
  const contextWorkflowId = getFromContextData(req, "workflowId");
  const workflowId = contextWorkflowId || queryWorkflowId;
  const idOrigin = contextWorkflowId
    ? "context"
    : queryWorkflowId
    ? "url"
    : null;
  return [workflowId, idOrigin];
}

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
  const sanitizedOptions = JSON.stringify(
    JSON.parse(JSON.stringify(options, replacer()))
  );
  try {
    responseCall = await axios(options);
    console.log("[Callback-To-Bot]");
    console.log("   Options: ", sanitizedOptions);
    console.log("   Status: ", responseCall.status);
    console.log("   Data: ", JSON.stringify(responseCall.data));
    console.log("   Error: NULL");
  } catch (error) {
    // global.Sentry.captureException(ex);
    console.error("[Callback-To-Bot]");
    console.error("   Options: ", sanitizedOptions);
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

function formTextWithOptionsResponse(platforms, responseText, responseOptions) {
  return [{ platforms, responseText, responseOptions }];
}

module.exports = {
  callback,
  formLinkResponse,
  formTextResponse,
  getWorkflowId,
  formTextWithOptionsResponse,
};
