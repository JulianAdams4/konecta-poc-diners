const router = require("express").Router();
const { SessionController } = require("../controllers");
const {
  isPublicRoute,
  hasNoSession,
  hasChangedState,
  hasExpiredSession,
} = require("./_helpers");

router.use("*", (req, res, next) => {
  if (isPublicRoute(req)) {
    global.logger.warn({
      message: {
        IgnoredPattern: true,
        baseUrl: req.baseUrl,
        BodyCallback: req.body.callback || {},
        BodyContext: req.body.context || {},
      },
      label: global.getLabel(__dirname, __filename),
    });
    return next();
  }

  global.logger.info({
    message: {
      baseUrl: req.baseUrl,
      BodyCallback: req.body.callback || {},
      BodyContext: req.body.context || {},
    },
    label: global.getLabel(__dirname, __filename),
  });

  if (hasNoSession(req)) {
    res.sendStatus(200);
    // No tiene sesion. Mandar al signin
    return SessionController.buildSignInLink({
      body: req.body,
      pendingPath: req.originalUrl,
    });
  }

  if (hasChangedState(req)) {
    res.sendStatus(200);
    // Anular la sesion y mandar al signin
    return SessionController.buildSignInLink({
      body: req.body,
      pendingPath: req.originalUrl,
      dropSession: true,
    });
  }

  if (hasExpiredSession(req)) {
    res.sendStatus(200);
    // Eliminar rastros de la sesion y mandar al signin
    return SessionController.buildSignInLink({
      body: req.body,
      pendingPath: req.originalUrl,
      dropSession: true,
    });
  }

  return next();
});

module.exports = router;
