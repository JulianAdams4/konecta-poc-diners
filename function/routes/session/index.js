/* eslint-disable import/no-unresolved */
const router = require("express").Router();

const { SessionController } = require("../../controllers");

router.get("/get-initialize", SessionController.HandleEntrypoint);

router.get("/get-callback", SessionController.HandleCallback);

router.get("/get-process-callback", (req, res) => res.status(200).json({}));

module.exports = router;
