/* eslint-disable import/no-unresolved */
const router = require("express").Router();

const { OfertasController } = require("../../controllers");

// router.get(
//   "/ofertasvalor",
//   OfertasController.HandleMassiveSelectProductOptionsToOffer
// );
router.post("/", OfertasController.HandleMassiveSelectProductOptionsToOffer);

module.exports = router;
