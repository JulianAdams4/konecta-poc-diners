const Loki = require("lokijs");

class Database {
  constructor(name) {
    this.db = new Loki(name);
    if (!this.db.getCollection("sessions")) {
      this.collection = this.db.addCollection("sessions");
      this.db.saveDatabase();
    }
  }

  insert({ key, value }) {
    this.db.getCollection("sessions").insert({ key, value });
  }

  findOne({ key }) {
    const collection = this.db.getCollection("sessions");
    return collection.findOne({ key });
  }

  update(lokiDocument) {
    this.db.getCollection("sessions").update(lokiDocument);
  }

  remove(lokiDocument) {
    this.db.getCollection("sessions").remove(lokiDocument);
  }
}

const instance = new Database("sessions.db");

module.exports = instance;
