const express = require("express");
const router = express.Router();
const {
    verifyToken,
    verifyTokenAdminAuth,
} = require("../middlewares/verify-token");
const authController = require("../controllers/auth-controller");

router.post("/register", authController.registerUser);

router.post("/login", authController.loginUser);

router.post("/refresh-access-token", authController.refreshAccessToken);

router.post("/logout", verifyToken, authController.logoutUser);

module.exports = router;
