global.Sentry = require('@sentry/node');

const dns = process.env.SENTRY_DNS;
let tags;

if (process.env.SENTRY_TAGS) {
  try {
    tags = JSON.parse(process.env.SENTRY_TAGS);
  } catch (ex) {
    // it doesn't matter
  }
}

function init() {
  if (dns) {
    global.Sentry.init({ dns });
    if (tags) {
      Object.keys(tags).forEach(tag => global.Sentry.setTag(tag, tags[tag]));
    }
  }
}

module.exports = {
  init,
};
