/* eslint-disable import/no-unresolved */
const router = require("express").Router();

const { TransfersController } = require("../../controllers");

/**
 * Transferencias entre cuentas propias
 */
router.post("/directa/cuenta-propia/cuenta-origen", (req, res) =>
  TransfersController.ListOwnAccounts(req, res, "originAccount")
);
router.post("/directa/cuenta-propia/cuenta-destino", (req, res) =>
  TransfersController.ListOwnAccounts(req, res, "targetAccount")
);
router.post("/directa/cuenta-propia/monto", (req, res) =>
  TransfersController.saveAmount(req, res, "saveTarget")
);
// TODO: Verificar si esta ruta puede ser general para cualquier transferencia
router.post("/directa/cuenta-propia/resumen", (req, res) =>
  TransfersController.saveAmount(req, res, "saveAmount")
);

// ******************************************
// TODO: A futuro
// router.post(
//   "/directa/cuenta-destino/nuevo-contacto",
//   TransfersController.ListTargetNewAccount
// );
// ******************************************
// TODO: A futuro
// router.post(
//   "/directa/cuenta-destino/beneficiario",
//   TransfersController.ListTargetBeneficiaryAccount
// );
// ******************************************

module.exports = router;
