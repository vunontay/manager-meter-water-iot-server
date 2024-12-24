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
                return res.status(404).json({ message: "No meters found" });
            }

            return res.status(200).json({
                data: result,
                message: "Get all measurements success",
            });
        } catch (error) {
            return res.status(500).json({
                message: "Failed to fetch measurements",
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
                    message: `Meter with code ${code_meter} not found`,
                });
            }

            // Lấy tất cả các bản ghi Measurement của Meter
            const measurements = await Measurement.find({ meter: meter._id });

            return res.status(200).json({
                data: measurements,
                message: `Get measurements for meter ${code_meter} success`,
            });
        } catch (error) {
            return res.status(500).json({
                message: "Failed to fetch measurements by meter",
                error: error.message,
            });
        }
    },

    // GET MEASUREMENTS BY USER ID
    getMeasurementsByUserId: async (req, res) => {
        try {
            const { userId } = req.params;

            const result = await Meter.aggregate([
                { $match: { user: new mongoose.Types.ObjectId(userId) } },
                {
                    $lookup: {
                        from: "measurements",
                        localField: "_id",
                        foreignField: "meter",
                        as: "measurements",
                    },
                },
                {
                    $project: {
                        _id: 1,
                        code_meter: 1,
                        totalFlow: { $sum: "$measurements.flow" },
                        totalVolume: { $sum: "$measurements.volume" },
                        measurements: 1,
                    },
                },
            ]);

            // Trường hợp không tìm thấy meters
            if (!result || result.length === 0) {
                return res.status(200).json({
                    data: {
                        userId,
                        meters: [],
                        totalFlow: 0,
                        totalVolume: 0,
                    },
                    message: `No measurements found for user ${userId}`,
                });
            }

            // Tính tổng toàn bộ flow và volume từ tất cả meters
            const totalFlow = result.reduce(
                (sum, meter) => sum + meter.totalFlow,
                0
            );
            const totalVolume = result.reduce(
                (sum, meter) => sum + meter.totalVolume,
                0
            );

            return res.status(200).json({
                data: {
                    userId,
                    meters: result,
                    totalFlow,
                    totalVolume,
                },
                message: `Measurements for user ${userId} fetched successfully`,
            });
        } catch (error) {
            return res.status(500).json({
                message: "Failed to fetch measurements by user ID",
                error: error.message,
            });
        }
    },

    // REQUEST MEASUREMENT
    requestMeasurement: async (req, res) => {
        const meters = await Meter.find({}, "code_meter");

        // Kiểm tra xem code_meter có được cung cấp hay không

        if (meters.length === 0) {
            return res.status(404).json({ message: "No meters found" });
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
                message: "Request sent to water meter, waiting for fake data",
            });
        } catch (error) {
            // Xử lý lỗi khi gửi yêu cầu qua MQTT
            console.error("Error sending request via MQTT:", error);
            return res.status(500).json({
                message: "Failed to send request to water meter",
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
                    .json({ message: "Measurement not found" });
            }
            return res
                .status(200)
                .json({ message: "Delete measurement success" });
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
                    .json({ message: "Measurement not found" });
            }

            return res.status(200).json({
                data: updatedMeasurement,
                message: "Update measurement success",
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
                return res.status(404).json({ message: "Meters not found" });
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
                message: "Get measurement success and message sent",
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
                message: "Get measurement success",
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
                    message: `Meter with code ${code_meter} not found`,
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
                message: `Reset measurement data for meter ${code_meter} successfully`,
            });
        } catch (error) {
            return res.status(500).json({
                message: "Failed to reset measurement",
                error: error.message,
            });
        }
    },
};

module.exports = measurementController;
