const addressController = require("../controllers/address-controller");
const middlewareAuth = require("../middlewares/verify-token");

const router = require("express").Router();

// Thêm địa chỉ cho người dùng
router.post("/add", middlewareAuth.verifyToken, addressController.addAddress);

// Lấy địa chỉ của người dùng
router.get(
    "/:user_id",
    middlewareAuth.verifyToken,
    addressController.getAddress
);

// Cập nhật địa chỉ của người dùng
router.put(
    "/:user_id/:address_id",
    middlewareAuth.verifyToken,
    addressController.updateAddress
);

// Xóa địa chỉ của người dùng
router.delete(
    "/:user_id/:address_id",
    middlewareAuth.verifyToken,
    addressController.deleteAddress
);

module.exports = router;
