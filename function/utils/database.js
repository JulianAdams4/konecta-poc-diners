const Loki = require("lokijs");

class Database {
  constructor(name) {
    this.db = new Loki(name);
  }

  configure() {
    if (!this.db.getCollection("sessions")) {
      this.collection = this.db.addCollection("sessions");
      this.db.saveDatabase();
    }
  }
}

module.exports = (name) => {
  const sharedDb = new Database(name);
  sharedDb.configure();
  return sharedDb;
};
