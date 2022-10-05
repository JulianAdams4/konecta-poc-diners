const router = require("express").Router();

const { SessionController } = require("../../controllers");

router.get("/logout", SessionController.buildSignInLink);

router.get("/get-initialize", SessionController.HandleEntrypoint);

router.get("/get-callback", SessionController.HandleCallback);

router.post("/get-otp-confirmation", SessionController.HandleOtpConfirmation);

module.exports = router;
