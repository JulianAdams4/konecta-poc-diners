const apiRouter = require("express").Router();

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

module.exports = apiRouter;
