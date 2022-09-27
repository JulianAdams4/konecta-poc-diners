const Transport = require('winston-transport');

module.exports = class CustomTransport extends Transport {
  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    callback();
  }
};
