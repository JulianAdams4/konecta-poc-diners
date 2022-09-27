/* eslint-disable import/no-unresolved */
const router = require("express").Router();

const { TarjetasController } = require("Controllers");

router.get(
  "ofertasvalor",
  TarjetasController.HandleMassiveSelectProductOptionsToOffer
);

module.exports = router;
