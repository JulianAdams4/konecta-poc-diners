const apiRouter = require("express").Router();

const SessionRoutes = require("./session");
const OfertasRoutes = require("./ofertas");
const TransferenciasRoutes = require("./transferencias");

apiRouter.use("/session", SessionRoutes);
apiRouter.use("/ofertas", OfertasRoutes);
apiRouter.use("/transferencias", TransferenciasRoutes);

// Generic routes
apiRouter.get("/metrics", (req, res) => res.sendStatus(200));

module.exports = apiRouter;
