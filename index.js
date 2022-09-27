/* eslint-disable max-len */
// Copyright (c) Alex Ellis 2021. All rights reserved.
// Copyright (c) OpenFaaS Author(s) 2021. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');

require('module-alias/register');

const handler = require('./function/handler');
const logger = require('./winston/logger');

const sentry = require('./sentry');
const utils = require('./utils');

const app = express();

global.DEBUG_LEVEL = /^\d+$/.test(process.env.DEBUG_LEVEL)
  ? parseInt(process.env.DEBUG_LEVEL, 10)
  : 1;

// eslint-disable-next-line no-console
console.log('debug level', global.DEBUG_LEVEL);
logger.init();
sentry.init();
utils.init();

const defaultMaxSize = '100kb'; // body-parser default

app.disable('x-powered-by');

const rawLimit = process.env.MAX_RAW_SIZE || defaultMaxSize;
const jsonLimit = process.env.MAX_JSON_SIZE || defaultMaxSize;

// The request handler must be the first middleware on the app
app.use(global.Sentry.Handlers.requestHandler());
app.use((req, res, next) => {
  // When no content-type is given, the body element is set to
  // nil, and has been a source of contention for new users.
  if (!req.headers['content-type']) {
    req.headers['content-type'] = 'text/plain';
  }
  next();
});

if (process.env.RAW_BODY === 'true') {
  app.use(bodyParser.raw({ type: '*/*', limit: rawLimit }));
} else {
  app.use(bodyParser.text({ type: 'text/*' }));
  app.use(bodyParser.json({ limit: jsonLimit }));
  app.use(bodyParser.urlencoded({ extended: true }));
}

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(
  morgan(
    (tokens, req, res) => [
      tokens.method(req, res),
      tokens.url(req, res),
      tokens.status(req, res),
      // eslint-disable-next-line no-nested-ternary
      global.DEBUG_LEVEL > 1
        ? JSON.stringify(req.body)
        : req.body && req.body.id && req.body.type
          ? JSON.stringify({ type: req.body.type, id: req.body.id })
          : JSON.stringify(req.body),
      tokens['response-time'](req, res),
      'ms',
    ].join(' '),
    {
      skip: req => req.body.password,
    },
  ),
);

const port = process.env.http_port || 3000;

app.listen(port, () => {
  global.logger.info({
    message: `Listening on port: ${port}`,
    label: global.getLabel(__dirname, __filename),
  });
});

const init = async () => handler({ app });
init();

// The error handler must be before any other error middleware and after all controllers
app.use(global.Sentry.Handlers.errorHandler());