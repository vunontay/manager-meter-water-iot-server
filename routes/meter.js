const meterController = require("../controllers/meter-controller");
const middlewareAuth = require("../middlewares/verify-token");

const router = require("express").Router();

// Thêm đồng hồ mới
router.post("/", middlewareAuth.verifyTokenAdminAuth, meterController.addMeter);

// Lấy tất cả đồng hồ của người dùng
router.get("/", middlewareAuth.verifyToken, meterController.getAllMeters);

// Lấy thông tin chi tiết một đồng hồ theo code_meter
router.get(
    "/:code_meter",
    middlewareAuth.verifyToken,
    meterController.getMeter
);

// Cập nhật thông tin đồng hồ (cập nhật location)
router.put(
    "/:code_meter",
    middlewareAuth.verifyTokenAdminAuth,
    meterController.updateMeter
);

// Xóa đồng hồ
router.delete(
    "/:code_meter",
    middlewareAuth.verifyTokenAdminAuth,
    meterController.deleteMeter
);

module.exports = router;
