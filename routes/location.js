const express = require("express");
const locationController = require("../controllers/location-controller");
const middlewareAuth = require("../middlewares/verify-token");

const router = express.Router();

// Tạo mới vị trí
router.post("/", middlewareAuth.verifyToken, locationController.createLocation);

// Lấy tất cả các vị trí
router.get("/", middlewareAuth.verifyToken, locationController.getLocations);

// Lấy một vị trí theo ID
router.get(
    "/:id",
    middlewareAuth.verifyToken,
    locationController.getLocationById
);

// Cập nhật một vị trí theo ID
router.put(
    "/:id",
    middlewareAuth.verifyToken,
    locationController.updateLocation
);

// Xóa một vị trí theo ID
router.delete(
    "/:id",
    middlewareAuth.verifyToken,
    locationController.deleteLocation
);

module.exports = router;
