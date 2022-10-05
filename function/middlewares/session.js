const router = require("express").Router();
const { SessionController } = require("../controllers");
const {
  isPublicRoute,
  isOauthRoute,
  getOauthTimeout,
  hasNoSession,
  hasChangedState,
  hasExpiredSession,
} = require("./_helpers");

router.use("*", (req, res, next) => {
  if (isPublicRoute(req)) {
    if (isOauthRoute(req)) {
      // * Increase timeout only for OAuth routes
      res.setTimeout(getOauthTimeout());
    }
    console.warn("[isPublicRoute]: ", req.originalUrl);
    console.warn("   BodyCallback: ", JSON.stringify(req.body.callback || {}));
    console.warn("   BodyContext:  ", JSON.stringify(req.body.context || {}));
    console.warn("");
    return next();
  }

  console.log("[Intern Route] - ", req.originalUrl);
  console.log("   BodyCallback: ", JSON.stringify(req.body.callback || {}));
  console.log("   BodyContext:  ", JSON.stringify(req.body.context || {}));
  console.log("");

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

  res.setTimeout(getOauthTimeout());
  return next();
});

module.exports = router;
