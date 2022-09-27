/* eslint-disable no-underscore-dangle */
const router = require('express').Router();
const axios = require('axios');

router.post('/', async (req, res) => {
  res.sendStatus(200); // send 200 OK as soon as possible.
  const options = {
    url: `${req.body.callback.baseUrl}/conversation/callback/${req.body.callback._id}`,
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    params: { token: `${req.body.callback.token}` },
    data: {
      responses: [],
      context: {
        control: {
          pointer: req.body.message.context.control.pointer,
          stack: req.body.message.context.control.stack,
        },
        data: req.body.message.context.data || {},
      },
    },
  };
  options.data.responses.push({
    platforms: ['all'],
    responseText: 'pong',
  });
  axios(options)
    .catch((error) => {
      global.logger.error({
        message: error && error.message ? error.message : error,
        label: global.getLabel(__dirname, __filename),
      });
    });
});

module.exports = router;
