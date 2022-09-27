const { createLogger, format, transports } = require('winston');

const CustomTransport = require('./customTransport');

const { combine, timestamp, printf } = format;

const myFormat = printf(
  ({ level, message, label }) => `${level}:\n${label ? `${label}\n` : ''}${JSON.stringify(message)}\n`,
);

function init() {
  global.logger = createLogger({
    prettyPrint: true,
    colorize: true,
    silent: false,
    timestamp: false,
    format: combine(timestamp(), format.colorize(), myFormat),
    transports:
      global.DEBUG_LEVEL > 0
        ? [new transports.Console(), new CustomTransport()]
        : [new CustomTransport()],
  });
}

module.exports = { init };
