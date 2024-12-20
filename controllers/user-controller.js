const User = require("../models/user");

const userController = {
    // ----------------------------------------------------------------GET ALL USER-------------------------------------------------------
    getAllUsers: async (req, res, next) => {
        try {
            const user = await User.find().populate("meters address");
            return res
                .status(200)
                .json({ data: user, message: "Get all user success" });
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
                return res.status(404).json({ message: "User not found" });
            }

            return res
                .status(200)
                .json({ data: user, message: "Get user success" });
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
                return res.status(404).json({ message: "User not found" });
            }

            return res
                .status(200)
                .json({ data: user, message: "Get user success" });
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
                return res.status(404).json({ message: "User not found" });
            }
            return res.status(200).json({ message: "Delete user success" });
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
                return res.status(404).json({ message: "User not found" });
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
                message: "User updated successfully",
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Internal server error",
                error: error.message,
            });
        }
    },
};

module.exports = userController;
