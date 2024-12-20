const measurementController = require("../controllers/measurement-controller");
const middlewareAuth = require("../middlewares/verify-token");

const router = require("express").Router();

// Lấy tất cả dữ liệu đo
router.get(
    "/",
    middlewareAuth.verifyToken,
    measurementController.getAllMeasurements
);

// Lấy một dữ liệu đo theo ID
router.get(
    "/:code_meter",
    middlewareAuth.verifyToken,
    measurementController.getMeasurementByMeter
);

router.get(
    "/user/:userId",
    middlewareAuth.verifyToken,
    measurementController.getMeasurementsByUserId
);

router.post("/", measurementController.getMeasurement);

router.post("/set-up", measurementController.setupMeasurements);

router.post(
    "/request",
    middlewareAuth.verifyToken,
    measurementController.requestMeasurement
);

// Xóa một dữ liệu đo
router.delete(
    "/:id",
    middlewareAuth.verifyToken,
    measurementController.deleteMeasurement
);

// Cập nhật thông tin dữ liệu đo
router.put(
    "/:id",
    middlewareAuth.verifyToken,
    measurementController.updateMeasurement
);

module.exports = router;
