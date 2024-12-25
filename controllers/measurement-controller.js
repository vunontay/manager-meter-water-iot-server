const { default: mongoose } = require("mongoose");
const { publishMessage } = require("../libs/mqtt/public");
const Measurement = require("../models/measurement");
const Meter = require("../models/meter");
const measurementController = {
    // GET ALL MEASUREMENTS
    getAllMeasurements: async (req, res) => {
        try {
            const result = await Meter.aggregate([
                {
                    $lookup: {
                        from: "measurements",
                        localField: "_id",
                        foreignField: "meter",
                        as: "measurements",
                    },
                },
                {
                    $addFields: {
                        latestMeasurement: {
                            $ifNull: [
                                {
                                    $arrayElemAt: [
                                        {
                                            $sortArray: {
                                                input: "$measurements",
                                                sortBy: { timestamp: -1 },
                                            },
                                        },
                                        0,
                                    ],
                                },
                                { flow: 0, volume: 0, timestamp: new Date() },
                            ],
                        },
                    },
                },
                {
                    $project: {
                        code_meter: 1,
                        flow: { $ifNull: ["$latestMeasurement.flow", 0] },
                        volume: { $ifNull: ["$latestMeasurement.volume", 0] },
                        measurementsCount: { $size: "$measurements" },
                        timestamp: "$latestMeasurement.timestamp",
                    },
                },
            ]);

            if (result.length === 0) {
                return res
                    .status(404)
                    .json({ message: "Không tìm thấy đồng hồ" });
            }

            return res.status(200).json({
                data: result,
                message: "Lấy tất cả dữ liệu đo lường thành công",
            });
        } catch (error) {
            return res.status(500).json({
                message: "Lấy tất cả dữ liệu đo lường thất bại",
                error: error.message,
            });
        }
    },

    // GET MEASUREMENT BY ID
    getMeasurementByMeter: async (req, res) => {
        const { code_meter } = req.params;

        try {
            // Tìm Meter tương ứng với code_meter
            const meter = await Meter.findOne({ code_meter });

            if (!meter) {
                return res.status(404).json({
                    message: `Đồng hồ với mã ${code_meter} không tồn tại`,
                });
            }

            // Lấy tất cả các bản ghi Measurement của Meter
            const measurements = await Measurement.find({ meter: meter._id });

            return res.status(200).json({
                data: measurements,
                message: `Lấy dữ liệu đo lường cho đồng hồ ${code_meter} thành công`,
            });
        } catch (error) {
            return res.status(500).json({
                message: "Lấy dữ liệu đo lường cho đồng hồ thất bại",
                error: error.message,
            });
        }
    },

    // GET MEASUREMENTS BY USER ID
    getMeasurementsByUserId: async (req, res) => {
        try {
            const { userId } = req.params;

            const getPricePerUnit = (volume) => {
                if (volume <= 10) return 5973;
                if (volume <= 20) return 7052;
                if (volume <= 30) return 8669;
                if (volume <= 40) return 10239;
                return 11615;
            };

            const result = await Meter.aggregate([
                { $match: { user: new mongoose.Types.ObjectId(userId) } },
                {
                    $lookup: {
                        from: "measurements",
                        localField: "_id",
                        foreignField: "meter",
                        pipeline: [
                            { $sort: { timestamp: -1 } }, // Sắp xếp theo thời gian giảm dần
                            { $limit: 1 }, // Chỉ lấy bản ghi mới nhất
                        ],
                        as: "latestMeasurement",
                    },
                },
                {
                    $unwind: {
                        path: "$latestMeasurement",
                        preserveNullAndEmptyArrays: true, // Giữ meter không có đo lường
                    },
                },
                {
                    $project: {
                        _id: 1,
                        code_meter: 1,
                        totalFlow: "$latestMeasurement.flow",
                        totalVolume: "$latestMeasurement.volume",
                        timestamp: "$latestMeasurement.timestamp",
                    },
                },
            ]);

            if (!result || result.length === 0) {
                return res.status(200).json({
                    data: {
                        userId,
                        meters: [],
                        totalFlow: 0,
                        totalVolume: 0,
                        totalAmount: 0,
                    },
                    message: `Không tìm thấy dữ liệu đo lường cho người dùng ${userId}`,
                });
            }

            let totalFlow = 0;
            let totalVolume = 0;
            let totalAmount = 0;

            const meterDetails = result.map((meter) => {
                const volume = meter.totalVolume || 0;
                const pricePerUnit = getPricePerUnit(volume);
                const amount = volume * pricePerUnit;

                totalFlow += meter.totalFlow || 0;
                totalVolume += volume;
                totalAmount += amount;

                return {
                    meter: meter._id,
                    code_meter: meter.code_meter,
                    flow: meter.totalFlow || 0,
                    volume,
                    timestamp: meter.timestamp
                        ? new Date(meter.timestamp).toISOString()
                        : null,
                    price_per_unit: pricePerUnit,
                    total_amount: amount,
                };
            });

            return res.status(200).json({
                data: {
                    userId,
                    meters: meterDetails,
                    totalFlow,
                    totalVolume,
                    totalAmount,
                },
                message: `Lấy dữ liệu đo lường và tính tiền cho người dùng ${userId} thành công`,
            });
        } catch (error) {
            return res.status(500).json({
                message: "Lấy dữ liệu đo lường và tính tiền thất bại",
                error: error.message,
            });
        }
    },

    // REQUEST MEASUREMENT
    requestMeasurement: async (req, res) => {
        const meters = await Meter.find({}, "code_meter");

        // Kiểm tra xem code_meter có được cung cấp hay không

        if (meters.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy đồng hồ" });
        }
        try {
            meters.forEach((meterId) => {
                const requestMessage = JSON.stringify({
                    code_meter: meterId.code_meter,
                });
                publishMessage("water-meter/request", requestMessage);
            });

            // Trả về phản hồi cho client ngay lập tức
            return res.status(200).json({
                message:
                    "Yêu cầu đã được gửi đến đồng hồ nước, đợi dữ liệu giả",
            });
        } catch (error) {
            // Xử lý lỗi khi gửi yêu cầu qua MQTT
            console.error("Error sending request via MQTT:", error);
            return res.status(500).json({
                message: "Gửi yêu cầu đến đồng hồ nước thất bại",
                error: error.message,
            });
        }
    },

    // DELETE MEASUREMENT
    deleteMeasurement: async (req, res) => {
        try {
            const { id } = req.params;
            const measurement = await Measurement.findByIdAndDelete(id);
            if (!measurement) {
                return res
                    .status(404)
                    .json({ message: "Dữ liệu đo lường không tồn tại" });
            }
            return res
                .status(200)
                .json({ message: "Xóa dữ liệu đo lường thành công" });
        } catch (error) {
            return res.status(500).json(error.message);
        }
    },

    // UPDATE MEASUREMENT
    updateMeasurement: async (req, res) => {
        try {
            const { id } = req.params;
            const { flow, volume } = req.body;

            const updatedMeasurement = await Measurement.findByIdAndUpdate(
                id,
                { flow, volume },
                { new: true }
            );

            if (!updatedMeasurement) {
                return res
                    .status(404)
                    .json({ message: "Dữ liệu đo lường không tồn tại" });
            }

            return res.status(200).json({
                data: updatedMeasurement,
                message: "Cập nhật dữ liệu đo lường thành công",
            });
        } catch (error) {
            return res.status(500).json(error.message);
        }
    },

    // Thao tác với mqtt server

    // SETUP MEASUREMENT
    setupMeasurements: async (req, res) => {
        try {
            // Lấy tất cả các đồng hồ với trường 'code_meter'
            const meters = await Meter.find({}, "code_meter");

            if (!meters || meters.length === 0) {
                return res
                    .status(404)
                    .json({ message: "Không tìm thấy đồng hồ" });
            }

            // Chuyển các mã đồng hồ (code_meter) thành một mảng các chỉ số
            const meterIds = meters.map((meter, index) =>
                Number(meter.code_meter)
            );

            // Gửi thông điệp đến MQTT với các meterIds (chỉ số)
            publishMessage(
                "client", // Topic gửi đi
                JSON.stringify({
                    ids: meterIds, // Mảng các chỉ số
                })
            );

            return res.status(200).json({
                message:
                    "Lấy dữ liệu đo lường thành công và thông điệp đã được gửi",
                data: meterIds,
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    },

    getOneMeasurement: async (req, res) => {
        try {
            const { code_meter } = req.params;

            publishMessage(
                "client", // Topic gửi đi
                JSON.stringify({
                    get: code_meter, // Yêu cầu GET
                })
            );

            return res.json({
                message:
                    "Lấy dữ liệu đo lường thành công và thông điệp đã được gửi",
            });
        } catch (error) {
            return res.status(500).json(error.message);
        }
    },

    resetMeasurement: async (req, res) => {
        try {
            const { code_meter } = req.params;

            // Kiểm tra đồng hồ tồn tại
            const meter = await Meter.findOne({ code_meter });
            if (!meter) {
                return res.status(404).json({
                    message: `Đồng hồ với mã ${code_meter} không tồn tại`,
                });
            }

            // Xóa tất cả measurements của đồng hồ này
            await Measurement.deleteMany({ meter: meter._id });

            // Đợi cho message được gửi thành công
            await publishMessage(
                "client",
                JSON.stringify({
                    id: Number(code_meter),
                    clear: 1,
                })
            );

            return res.status(200).json({
                message: `Xóa dữ liệu đo lường cho đồng hồ ${code_meter} thành công`,
            });
        } catch (error) {
            return res.status(500).json({
                message: "Xóa dữ liệu đo lường cho đồng hồ thất bại",
                error: error.message,
            });
        }
    },
};

module.exports = measurementController;
