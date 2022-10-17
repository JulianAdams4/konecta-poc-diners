const path = require("path");
const middlewares = require("./middlewares");
const allRoutes = require("./routes");

class Routing {
  constructor(app) {
    this.app = app;
  }

  configure() {
    this.app.use(middlewares.session);
    this.app.set("views", path.join(__dirname, "views"));
    this.app.set("view engine", "ejs");
  }

  bind() {
    this.app.use(allRoutes);
    this.app.use("*", (req, res) =>
      res.status(404).json({ message: "Not found" })
    );
  }
}

module.exports = async (config) => {
  const routing = new Routing(config.app);
  routing.configure();
  routing.bind();
};
