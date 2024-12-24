const measurementController = require("../controllers/measurement-controller");
const middlewareAuth = require("../middlewares/verify-token");

const router = require("express").Router();

// Setup measurements
router.post("/set-up", measurementController.setupMeasurements);

// Request measurement
router.post(
    "/request",
    middlewareAuth.verifyToken,
    measurementController.requestMeasurement
);

// Get one measurement
router.post("/get/:code_meter", measurementController.getOneMeasurement);

// Reset measurement
router.post("/reset/:code_meter", measurementController.resetMeasurement);

// Get all measurements
router.get(
    "/",
    middlewareAuth.verifyToken,
    measurementController.getAllMeasurements
);

// Get measurements by user ID
router.get(
    "/user/:userId",
    middlewareAuth.verifyToken,
    measurementController.getMeasurementsByUserId
);

// Get measurement by meter ID
router.get(
    "/:code_meter",
    middlewareAuth.verifyToken,
    measurementController.getMeasurementByMeter
);

// Delete measurement
router.delete(
    "/:id",
    middlewareAuth.verifyToken,
    measurementController.deleteMeasurement
);

// Update measurement
router.put(
    "/:id",
    middlewareAuth.verifyToken,
    measurementController.updateMeasurement
);

module.exports = router;
