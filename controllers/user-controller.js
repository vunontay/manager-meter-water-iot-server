const User = require("../models/user");

const userController = {
    // ----------------------------------------------------------------GET ALL USER-------------------------------------------------------
    getAllUsers: async (req, res, next) => {
        try {
            const user = await User.find().populate("meters address");
            return res
                .status(200)
                .json({
                    data: user,
                    message: "Lấy tất cả người dùng thành công",
                });
        } catch (error) {
            return res.status(500).json(error.message);
        }
    },

    // ------------------------------------------------------GET USER BY PHONE NUMBER----------------------------------------------------

    getUserByPhoneNumber: async (req, res, next) => {
        try {
            const { phone } = req.params;

            const user = await User.findOne({ phone });

            if (!user) {
                return res
                    .status(404)
                    .json({ message: "Không tìm thấy người dùng" });
            }

            return res
                .status(200)
                .json({ data: user, message: "Lấy người dùng thành công" });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    },

    // ----------------------------------------------------------------GET ALL USER-------------------------------------------------------
    getUser: async (req, res, next) => {
        try {
            const { id } = req.params;
            const user = await User.findById(id);
            if (!user) {
                return res
                    .status(404)
                    .json({ message: "Không tìm thấy người dùng" });
            }

            return res
                .status(200)
                .json({ data: user, message: "Lấy người dùng thành công" });
        } catch (error) {
            return res.status(500).json(error.message);
        }
    },

    // ----------------------------------------------------------------DELETE USER-------------------------------------------------------

    deleteUser: async (req, res, next) => {
        try {
            const { id } = req.params;

            const user = await User.findByIdAndDelete(id);
            if (!user) {
                return res
                    .status(404)
                    .json({ message: "Không tìm thấy người dùng" });
            }
            return res
                .status(200)
                .json({ message: "Xóa người dùng thành công" });
        } catch (error) {
            return res.status(500).json(error.message);
        }
    },

    // ----------------------------------------------------------------UPDATE USER-------------------------------------------------------
    updateUser: async function (req, res) {
        try {
            const { id } = req.params;
            const { first_name, last_name, email, avatar } = req.body;

            // Kiểm tra người dùng tồn tại hay không
            const user = await User.findById(id);
            if (!user) {
                return res
                    .status(404)
                    .json({ message: "Không tìm thấy người dùng" });
            }

            // Cập nhật từng trường, giữ nguyên giá trị cũ nếu không có dữ liệu mới
            user.first_name = first_name || user.first_name;
            user.last_name = last_name || user.last_name;
            user.email = email || user.email;
            user.avatar = avatar || user.avatar;

            // Lưu các thay đổi vào cơ sở dữ liệu
            const updatedUser = await user.save();

            return res.status(200).json({
                data: updatedUser,
                message: "Người dùng đã được cập nhật thành công",
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Lỗi máy chủ nội bộ",
                error: error.message,
            });
        }
    },
};

module.exports = userController;
