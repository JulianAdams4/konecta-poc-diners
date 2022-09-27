/* eslint-disable no-unused-vars */
/* eslint-disable import/no-unresolved */
const apiRouter = require("express").Router();

const { SessionController } = require("Controllers");

const SessionRoutes = require("./session");
const TarjetasRoutes = require("./tarjetas");

apiRouter.use("/session", SessionRoutes);
apiRouter.use("/tarjetas", TarjetasRoutes);

// Generic routes
const dummyResponse = (req, res) => {
  return res.status(200).json({});
};
apiRouter.get("/metrics", dummyResponse);
apiRouter.post("7metrics", dummyResponse);

apiRouter.post("/julian", (req, res) => {
  return SessionController.buildSignInLink({
    body: { ...req.body, callback: {} },
    pendingPath: req.originalUrl,
  });
});

module.exports = apiRouter;
