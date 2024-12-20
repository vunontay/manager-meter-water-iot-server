const userController = require("../controllers/user-controller");
const middlewareAuth = require("../middlewares/verify-token");

const router = require("express").Router();

router.get("/", middlewareAuth.verifyToken, userController.getAllUsers);
router.get("/:id", middlewareAuth.verifyToken, userController.getUser);
router.get(
    "/search/:phone",
    middlewareAuth.verifyToken,
    userController.getUserByPhoneNumber
);
router.put(
    "/:id",
    middlewareAuth.verifyTokenAdminAuth,
    userController.updateUser
);
router.delete(
    "/:id",
    middlewareAuth.verifyTokenAdminAuth,
    userController.deleteUser
);
module.exports = router;
