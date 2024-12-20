const emailController = require("../controllers/email-controller");
const middlewareAuth = require("../middlewares/verify-token");

const router = require("express").Router();
router.post(
    "/send-all",
    middlewareAuth.verifyTokenAdminAuth,
    emailController.sendAllUnpaidInvoiceEmails
);
router.post(
    "/send",
    middlewareAuth.verifyTokenAdminAuth,
    emailController.sendInvoiceEmail
);

module.exports = router;
