const Measurement = require("../models/measurement");
const getMonthName = require("../utils/utils");

const statsController = {
    monthlyConsumption: async (req, res) => {
        const currentYear = new Date().getFullYear();

        try {
            // Sử dụng MongoDB aggregate để tính tổng lượng tiêu thụ theo tháng
            const consumptionData = await Measurement.aggregate([
                {
                    $match: {
                        // Lọc các bản ghi trong năm hiện tại
                        timestamp: {
                            $gte: new Date(currentYear, 0, 1), // Ngày bắt đầu năm
                            $lt: new Date(currentYear + 1, 0, 1), // Ngày bắt đầu năm sau
                        },
                    },
                },
                {
                    $project: {
                        // Tạo các trường month, year từ timestamp và giữ lại volume (lượng tiêu thụ)
                        month: { $month: "$timestamp" },
                        year: { $year: "$timestamp" },
                        volume: 1, // Lượng tiêu thụ nước
                    },
                },
                {
                    $group: {
                        // Nhóm dữ liệu theo năm và tháng, tính tổng lượng tiêu thụ (volume)
                        _id: { month: "$month", year: "$year" },
                        total_consumption: { $sum: "$volume" },
                    },
                },
                {
                    $sort: {
                        "_id.year": 1,
                        "_id.month": 1,
                    },
                },
            ]);

            // Tạo mảng 12 tháng với giá trị mặc định là 0
            const monthlyConsumption = Array.from(
                { length: 12 },
                (_, index) => {
                    const monthData = consumptionData.find(
                        (data) =>
                            data._id.month === index + 1 &&
                            data._id.year === currentYear
                    );
                    return {
                        name: getMonthName(index),
                        total: monthData ? monthData.total_consumption : 0, // Nếu không có dữ liệu, gán 0
                    };
                }
            );

            res.status(200).json({
                data: monthlyConsumption,
                message: "Lấy lượng tiêu thụ theo tháng thành công",
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

module.exports = statsController;
