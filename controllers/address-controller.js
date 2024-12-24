const Address = require("../models/address");
const User = require("../models/user");

const addressController = {
    // Thêm địa chỉ cho người dùng
    addAddress: async (req, res) => {
        try {
            const { city, district, commune, note, more_info, user_id } =
                req.body;

            // Kiểm tra người dùng có tồn tại không
            const user = await User.findById(user_id);
            if (!user) {
                return res
                    .status(404)
                    .json({ message: "Không tìm thấy người dùng" });
            }

            // Tạo địa chỉ mới
            const newAddress = new Address({
                city,
                district,
                commune,
                note,
                more_info,
                user_id: user._id,
            });

            // Lưu địa chỉ vào cơ sở dữ liệu
            await newAddress.save();

            // Cập nhật trường address trong User (liên kết với địa chỉ)
            user.address = newAddress._id;
            await user.save();

            return res.status(201).json({
                message: "Thêm địa chỉ thành công",
                data: newAddress,
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    },

    // Lấy địa chỉ của người dùng
    getAddress: async (req, res) => {
        try {
            const { user_id } = req.params;

            // Tìm người dùng và lấy địa chỉ liên kết
            const user = await User.findById(user_id).populate("address");
            if (!user || !user.address) {
                return res
                    .status(404)
                    .json({
                        message: "Không tìm thấy người dùng hoặc địa chỉ",
                    });
            }

            return res.status(200).json({
                data: user.address,
                message: "Lấy địa chỉ thành công",
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    },

    // Cập nhật địa chỉ của người dùng
    updateAddress: async (req, res) => {
        try {
            const { user_id, address_id } = req.params;
            const { city, district, commune, note, more_info } = req.body;

            // Tìm người dùng và địa chỉ
            const user = await User.findById(user_id);
            if (!user) {
                return res
                    .status(404)
                    .json({ message: "Không tìm thấy người dùng" });
            }

            const address = await Address.findById(address_id);
            if (!address) {
                return res
                    .status(404)
                    .json({ message: "Không tìm thấy địa chỉ" });
            }

            // Cập nhật địa chỉ
            address.city = city || address.city;
            address.district = district || address.district;
            address.commune = commune || address.commune;
            address.note = note || address.note;
            address.more_info = more_info || address.more_info;

            await address.save();

            return res.status(200).json({
                message: "Cập nhật địa chỉ thành công",
                data: address,
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    },

    // Xóa địa chỉ của người dùng
    deleteAddress: async (req, res) => {
        try {
            const { user_id, address_id } = req.params;

            // Tìm người dùng
            const user = await User.findById(user_id);
            if (!user) {
                return res
                    .status(404)
                    .json({ message: "Không tìm thấy người dùng" });
            }

            // Tìm địa chỉ
            const address = await Address.findById(address_id);
            if (!address) {
                return res
                    .status(404)
                    .json({ message: "Không tìm thấy địa chỉ" });
            }

            // Xóa địa chỉ
            await Address.findByIdAndDelete(address_id); // Xóa địa chỉ bằng phương thức `findByIdAndDelete`

            // Cập nhật lại địa chỉ trong người dùng
            user.address = null;
            await user.save();

            return res.status(200).json({ message: "Xóa địa chỉ thành công" });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: error.message });
        }
    },
};

module.exports = addressController;
