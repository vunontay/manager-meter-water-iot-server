const jwt = require("jsonwebtoken");

const middlewareAuth = {
    // Middleware xác thực token
    verifyToken: (req, res, next) => {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Token là bắt buộc" });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res
                    .status(403)
                    .json({ message: "Token không hợp lệ hoặc đã hết hạn" });
            }
            req.user = user; // Lưu thông tin người dùng từ token
            next();
        });
    },

    // Middleware phân quyền cho admin
    verifyTokenAdminAuth: (req, res, next) => {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Token là bắt buộc" });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res
                    .status(403)
                    .json({ message: "Token không hợp lệ hoặc đã hết hạn" });
            }

            // Kiểm tra role của user
            if (user.role !== "admin") {
                return res
                    .status(403)
                    .json({
                        message: "Truy cập bị từ chối. Chỉ dành cho admin.",
                    });
            }

            req.user = user; // Lưu thông tin người dùng từ token
            next();
        });
    },
};

module.exports = middlewareAuth;
