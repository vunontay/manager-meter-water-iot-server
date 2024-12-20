const invoiceController = require("../controllers/invoice-controller");
const middlewareAuth = require("../middlewares/verify-token");

const router = require("express").Router();

router.get("/", middlewareAuth.verifyToken, invoiceController.getInvoices);
router.delete(
    "/",
    middlewareAuth.verifyToken,
    invoiceController.deleteAllInvoices
);

module.exports = router;
