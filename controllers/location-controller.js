const Location = require("../models/location");

const locationController = {
    // Tạo một vị trí mới
    createLocation: async (req, res) => {
        try {
            const { name, longitude, latitude, note } = req.body;

            // Tạo đối tượng Location mới
            const newLocation = new Location({
                name,
                longitude,
                latitude,
                note,
            });

            // Lưu vào cơ sở dữ liệu
            await newLocation.save();

            return res.status(201).json({
                message: "Vị trí đã được tạo thành công",
                data: newLocation,
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    },

    // Lấy tất cả vị trí
    getLocations: async (req, res) => {
        try {
            const locations = await Location.find();
            return res.status(200).json({
                data: locations,
                message: "Vị trí đã được lấy thành công",
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    },

    // Lấy một vị trí theo ID
    getLocationById: async (req, res) => {
        try {
            const { id } = req.params;
            const location = await Location.findById(id);
            if (!location) {
                return res
                    .status(404)
                    .json({ message: "Không tìm thấy vị trí" });
            }
            return res.status(200).json({
                data: location,
                message: "Vị trí đã được lấy thành công",
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    },

    // Cập nhật vị trí
    updateLocation: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, longitude, latitude, note } = req.body;

            const location = await Location.findById(id);
            if (!location) {
                return res
                    .status(404)
                    .json({ message: "Không tìm thấy vị trí" });
            }

            location.name = name || location.name;
            location.longitude = longitude || location.longitude;
            location.latitude = latitude || location.latitude;
            location.note = note || location.note;

            await location.save();

            return res.status(200).json({
                message: "Vị trí đã được cập nhật thành công",
                data: location,
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    },

    // Xóa vị trí
    deleteLocation: async (req, res) => {
        try {
            const { id } = req.params;

            const location = await Location.findByIdAndDelete(id);
            if (!location) {
                return res
                    .status(404)
                    .json({ message: "Không tìm thấy vị trí" });
            }

            return res.status(200).json({
                message: "Vị trí đã được xóa thành công",
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    },
};

module.exports = locationController;
