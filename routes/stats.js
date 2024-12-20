const statsController = require("../controllers/stats-controller");
const middlewareAuth = require("../middlewares/verify-token");

const router = require("express").Router();

router.get(
    "/monthly-consumption",
    middlewareAuth.verifyToken,
    statsController.monthlyConsumption
);

module.exports = router;
