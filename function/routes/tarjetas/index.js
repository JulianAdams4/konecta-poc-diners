/* eslint-disable import/no-unresolved */
const router = require("express").Router();

const { TarjetasController } = require("../../controllers");

router.get(
  "ofertasvalor",
  TarjetasController.HandleMassiveSelectProductOptionsToOffer
);

module.exports = router;
