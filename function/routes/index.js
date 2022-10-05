const apiRouter = require("express").Router();

const SessionRoutes = require("./session");
const TarjetasRoutes = require("./tarjetas");

apiRouter.use("/session", SessionRoutes);
apiRouter.use("/tarjetas", TarjetasRoutes);

// Generic routes
apiRouter.get("/metrics", (req, res) => res.sendStatus(200));

module.exports = apiRouter;
