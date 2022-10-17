const router = require("express").Router();
const { SessionController } = require("../controllers");
const {
  isPublicRoute,
  isOauthRoute,
  getOauthTimeout,
  hasNoSession,
  hasChangedState,
  hasExpiredSession,
  getDefaultTimeout,
  logPublicRoute,
  logProtectedRoute,
} = require("./_helpers");

router.use("*", (req, res, next) => {
  if (isPublicRoute(req)) {
    if (isOauthRoute(req)) {
      // * Increase timeout only for OAuth routes
      res.setTimeout(getOauthTimeout());
    }
    logPublicRoute(req);
    return next();
  }

  logProtectedRoute(req);

  if (hasNoSession(req)) {
    res.sendStatus(200);
    return SessionController.buildSignInLink({
      body: req.body,
      pendingPath: req.originalUrl,
    });
  }

  if (hasChangedState(req)) {
    res.sendStatus(200);
    return SessionController.buildSignInLink({
      body: req.body,
      pendingPath: req.originalUrl,
      dropSession: true,
    });
  }

  if (hasExpiredSession(req)) {
    res.sendStatus(200);
    return SessionController.buildSignInLink({
      body: req.body,
      pendingPath: req.originalUrl,
      dropSession: true,
    });
  }

  // * Increase timeout for non-production environments
  res.setTimeout(getDefaultTimeout());
  return next();
});

module.exports = router;
