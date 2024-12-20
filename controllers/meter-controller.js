const Meter = require("../models/meter");
const User = require("../models/user");
const Location = require("../models/location");

const meterController = {
    // Thêm đồng hồ mới
    addMeter: async (req, res) => {
        try {
            const { code_meter, user_id, status, note, location_id } = req.body;

            // Kiểm tra nếu `code_meter` không có giá trị hợp lệ
            if (!code_meter || code_meter === null || code_meter === "") {
                return res
                    .status(400)
                    .json({ message: "Meter code (code_meter) is required" });
            }

            // Kiểm tra người dùng tồn tại
            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            // Kiểm tra vị trí đồng hồ tồn tại
            const location = await Location.findById(location_id);
            if (!location) {
                return res.status(404).json({ message: "Location not found" });
            }

            // Tạo đồng hồ mới với `code_meter` đã cung cấp
            const newMeter = new Meter({
                code_meter, // Đảm bảo `code_meter` không phải là null
                user: user._id, // Liên kết với người dùng
                location: location._id, // Liên kết với vị trí
                status, // Trạng thái đồng hồ
                note, // Ghi chú đồng hồ
            });

            // Lưu đồng hồ vào cơ sở dữ liệu
            await newMeter.save();

            // Cập nhật mảng `meters` trong `User`
            user.meters.push(newMeter._id); // Thêm ID của `Meter` vào mảng `meters` của `User`
            await user.save(); // Lưu lại người dùng với thông tin mới

            return res.status(201).json({
                message: "Meter added successfully",
                data: newMeter,
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: error.message });
        }
    },

    // Lấy tất cả các đồng hồ
    getAllMeters: async (req, res) => {
        try {
            // Lấy tất cả đồng hồ từ cơ sở dữ liệu
            const meters = await Meter.find().populate("location user"); // Populate location và user để lấy thông tin chi tiết về vị trí và người dùng

            // Trả về kết quả
            return res.status(200).json({
                data: meters,
                message: "All meters fetched successfully",
            });
        } catch (error) {
            console.error(error); // Log lỗi để tiện cho việc debug
            return res.status(500).json({ message: error.message });
        }
    },

    // Lấy thông tin chi tiết một đồng hồ
    getMeter: async (req, res) => {
        try {
            const { code_meter } = req.params;

            const meter = await Meter.findOne({ code_meter }).populate(
                "location measurements"
            );
            if (!meter) {
                return res.status(404).json({ message: "Meter not found" });
            }

            return res.status(200).json({
                data: meter,
                message: "Meter fetched successfully",
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    },

    // Cập nhật thông tin đồng hồ
    updateMeter: async (req, res) => {
        try {
            const { code_meter } = req.params;
            const { location_id, status, note } = req.body;

            const meter = await Meter.findOne({ code_meter });
            if (!meter) {
                return res.status(404).json({ message: "Meter not found" });
            }

            // Cập nhật thông tin đồng hồ
            meter.status = status || meter.status;
            meter.note = note || meter.note;

            // Cập nhật vị trí nếu có
            if (location_id) {
                const location = await Location.findById(location_id);
                if (!location) {
                    return res
                        .status(404)
                        .json({ message: "Location not found" });
                }
                meter.location = location._id; // Cập nhật location của meter
            }

            // Lưu lại thay đổi
            await meter.save();

            return res.status(200).json({
                data: meter,
                message: "Meter updated successfully",
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    },

    // Xóa đồng hồ
    deleteMeter: async (req, res) => {
        try {
            const { code_meter } = req.params;

            // Tìm và xóa Meter
            const meter = await Meter.findOneAndDelete({ code_meter });
            if (!meter) {
                return res.status(404).json({ message: "Meter not found" });
            }

            // Tìm User liên quan đến Meter
            const user = await User.findById(meter.user); // Lấy User liên kết với Meter
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            // Xóa ID của Meter khỏi mảng `meters` của User
            user.meters = user.meters.filter(
                (meterId) => meterId.toString() !== meter._id.toString()
            );
            await user.save(); // Lưu lại User sau khi cập nhật mảng `meters`

            return res
                .status(200)
                .json({ message: "Meter deleted successfully" });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    },
};

module.exports = meterController;
