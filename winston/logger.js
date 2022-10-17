const { createLogger, format, transports } = require('winston');

const CustomTransport = require('./customTransport');

// eslint-disable-next-line no-unused-vars
const { combine, timestamp, printf } = format;

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    // eslint-disable-next-line consistent-return
    return value;
  };
};

const myFormat = printf(
  ({ level, message, label }) => `${level}:\n${label ? `${label}\n` : ''}${JSON.stringify(
    message,
    getCircularReplacer(),
  )}\n`,
);

function init() {
  global.logger = createLogger({
    prettyPrint: true,
    colorize: true,
    silent: false,
    timestamp: false,
    format: combine(
      // timestamp(),
      format.colorize(),
      myFormat,
    ),
    transports:
      global.DEBUG_LEVEL > 0
        ? [new transports.Console(), new CustomTransport()]
        : [new CustomTransport()],
  });
}

module.exports = { init };
