const router = require('express').Router();
const basicAuth = require('express-basic-auth');

router.use(basicAuth({ users: { admin: 'supersecret' } }));

module.exports = router;
