const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const authController = {
    // Đăng ký
    registerUser: async (req, res) => {
        try {
            const { first_name, last_name, email, phone, password, role } =
                req.body;

            // Kiểm tra nếu email hoặc số điện thoại đã tồn tại
            const existingUser = await User.findOne({
                $or: [{ email }, { phone }],
            });
            if (existingUser) {
                return res
                    .status(400)
                    .json({
                        message: "Email hoặc số điện thoại đã được sử dụng",
                    });
            }

            // Mã hóa mật khẩu
            const hashedPassword = await bcrypt.hash(password, 10);

            // Tạo người dùng mới
            const newUser = await User.create({
                first_name,
                last_name,
                email,
                phone,
                password: hashedPassword,
                role,
            });

            return res.status(201).json({
                message: "Đăng ký người dùng thành công",
                data: {
                    first_name: newUser.first_name,
                    last_name: newUser.last_name,
                    email: newUser.email,
                    phone: newUser.phone,
                    role: newUser.role,
                },
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    },

    loginUser: async (req, res) => {
        try {
            const { phone, password } = req.body;

            const user = await User.findOne({ phone });
            if (!user) {
                return res
                    .status(404)
                    .json({ message: "Không tìm thấy số điện thoại" });
            }

            const isPasswordValid = await bcrypt.compare(
                password,
                user.password
            );
            if (!isPasswordValid) {
                return res.status(401).json({ message: "Mật khẩu không đúng" });
            }

            // Tạo access token và refresh token
            const accessToken = jwt.sign(
                { id: user._id, role: user.role }, // role sẽ được mã hóa vào accessToken
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );

            const refreshToken = jwt.sign(
                { id: user._id, role: user.role }, // Mã hóa role vào refreshToken
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: "7d" }
            );

            return res.status(200).json({
                message: "Đăng nhập thành công",
                data: {
                    tokens: {
                        accessToken,
                        refreshToken,
                    },
                    role: user.role,
                    _id: user._id,
                },
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    },

    // Làm mới access token
    refreshAccessToken: async (req, res) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res
                    .status(401)
                    .json({ message: "Yêu cầu refresh token" });
            }

            // Giải mã refreshToken để lấy role
            jwt.verify(
                refreshToken,
                process.env.JWT_REFRESH_SECRET,
                (err, user) => {
                    if (err) {
                        return res
                            .status(403)
                            .json({ message: "Refresh token không hợp lệ" });
                    }

                    const newAccessToken = jwt.sign(
                        { id: user.id, role: user.role },
                        process.env.JWT_SECRET,
                        { expiresIn: "1h" }
                    );

                    return res.status(200).json({
                        message: "Làm mới access token thành công",
                        data: {
                            tokens: {
                                newAccessToken,
                            },
                        },
                    });
                }
            );
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    },

    // Đăng xuất
    logoutUser: (req, res) => {
        try {
            return res.status(200).json({ message: "Đăng xuất thành công" });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    },
};

module.exports = authController;
