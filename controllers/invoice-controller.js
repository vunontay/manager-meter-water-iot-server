const Meter = require("../models/meter");
const Invoice = require("../models/invoice");
const InvoiceDetail = require("../models/invoiceDetail");
const User = require("../models/user");
const { default: mongoose } = require("mongoose");

const invoiceController = {
    getInvoices: async (req, res) => {
        const { default: pLimit } = await import("p-limit");

        try {
            const startDate = new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1
            ); // Ngày bắt đầu tháng
            const endDate = new Date(
                new Date().getFullYear(),
                new Date().getMonth() + 1,
                0
            ); // Ngày kết thúc tháng

            const getPricePerUnit = (volume) => {
                // Biểu giá nước sinh hoạt (VNĐ/m³)
                if (volume <= 10) return 5973; // Bậc 1: 0-10m³: 5.973đ/m³
                if (volume <= 20) return 7052; // Bậc 2: 10-20m³: 7.052đ/m³
                if (volume <= 30) return 8669; // Bậc 3: 20-30m³: 8.669đ/m³
                if (volume <= 40) return 10239; // Bậc 4: 30-40m³: 10.239đ/m³
                return 11615; // Bậc 5: >40m³: 11.615đ/m³
            };

            const meterMeasurements = await Meter.aggregate([
                {
                    $lookup: {
                        from: "measurements",
                        localField: "_id",
                        foreignField: "meter",
                        pipeline: [
                            {
                                $match: {
                                    timestamp: {
                                        $gte: startDate, // Ngày bắt đầu
                                        $lte: endDate, // Ngày kết thúc
                                    },
                                },
                            },
                        ],
                        as: "measurements",
                    },
                },
                {
                    $project: {
                        code_meter: 1,
                        user: 1,
                        installation_date: 1,
                        totalVolume: { $sum: "$measurements.volume" },
                        totalFlow: { $sum: "$measurements.flow" },
                        measurementsCount: { $size: "$measurements" },
                    },
                },
            ]);

            const userInvoices = {};

            for (let meterData of meterMeasurements) {
                const userId = meterData.user;
                const invoiceStartDate = new Date(
                    Math.max(meterData.installation_date, startDate)
                );

                if (!userInvoices[userId]) {
                    userInvoices[userId] = {
                        user: userId,
                        totalVolume: 0,
                        totalAmount: 0,
                        invoiceDetail: [],
                        start_period: invoiceStartDate,
                        end_period: endDate,
                    };
                }

                const pricePerUnit = getPricePerUnit(meterData.totalVolume);
                const totalAmount = meterData.totalVolume * pricePerUnit;

                userInvoices[userId].totalVolume += meterData.totalVolume;
                userInvoices[userId].totalAmount += totalAmount;

                userInvoices[userId].invoiceDetail.push({
                    meter: meterData._id,
                    price_per_unit: pricePerUnit,
                    volume: meterData.totalVolume,
                    total_amount: totalAmount,
                });
            }
            const limit = pLimit(5);
            const invoicePromises = Object.values(userInvoices).map(
                (userInvoice) =>
                    limit(async () => {
                        // Kiểm tra xem hóa đơn đã tồn tại chưa
                        const existingInvoice = await Invoice.findOne({
                            user: userInvoice.user,
                            start_period: userInvoice.start_period,
                            end_period: userInvoice.end_period,
                        });

                        if (!existingInvoice) {
                            // Nếu hóa đơn chưa tồn tại, tạo mới hóa đơn
                            const newInvoice = new Invoice({
                                user: userInvoice.user,
                                start_period: userInvoice.start_period,
                                end_period: userInvoice.end_period,
                                volume_consumed: userInvoice.totalVolume,
                                total_amount: userInvoice.totalAmount,
                                status: "init",
                            });

                            const invoiceDetailsToSave = [];

                            // Kiểm tra chi tiết hóa đơn đã tồn tại hay chưa
                            for (const detail of userInvoice.invoiceDetail) {
                                const existingDetail =
                                    await InvoiceDetail.findOne({
                                        invoice: newInvoice._id,
                                        meter: detail.meter,
                                    });

                                if (!existingDetail) {
                                    const invoiceDetail = new InvoiceDetail({
                                        invoice: newInvoice._id,
                                        meter: detail.meter,
                                        price_per_unit: detail.price_per_unit,
                                    });

                                    invoiceDetailsToSave.push(invoiceDetail);
                                }
                            }

                            // Lưu các chi tiết hóa đơn vào DB
                            if (invoiceDetailsToSave.length > 0) {
                                await InvoiceDetail.insertMany(
                                    invoiceDetailsToSave
                                );
                                newInvoice.invoice_detail.push(
                                    ...invoiceDetailsToSave.map((d) => d._id)
                                );
                            }

                            // Lưu hóa đơn mới
                            await newInvoice.save();
                            return newInvoice; // Trả về hóa đơn mới
                        } else {
                            // Nếu hóa đơn đã tồn tại, cập nhật thông tin
                            existingInvoice.volume_consumed =
                                userInvoice.totalVolume;
                            existingInvoice.total_amount =
                                userInvoice.totalAmount;

                            const invoiceDetailsToUpdate = [];

                            // Kiểm tra chi tiết hóa đơn và thêm vào nếu chưa có
                            for (const detail of userInvoice.invoiceDetail) {
                                const existingDetail =
                                    await InvoiceDetail.findOne({
                                        invoice: existingInvoice._id,
                                        meter: detail.meter,
                                    });

                                if (!existingDetail) {
                                    const invoiceDetail = new InvoiceDetail({
                                        invoice: existingInvoice._id,
                                        meter: detail.meter,
                                        price_per_unit: detail.price_per_unit,
                                    });

                                    invoiceDetailsToUpdate.push(invoiceDetail);
                                }
                            }

                            // Cập nhật các chi tiết hóa đơn mới vào DB
                            if (invoiceDetailsToUpdate.length > 0) {
                                await InvoiceDetail.insertMany(
                                    invoiceDetailsToUpdate
                                );
                                existingInvoice.invoice_detail.push(
                                    ...invoiceDetailsToUpdate.map((d) => d._id)
                                );
                            }

                            // Lưu lại hóa đơn đã được cập nhật
                            await existingInvoice.save();
                            return existingInvoice; // Trả về hóa đơn đã cập nhật
                        }
                    })
            );

            const invoices = await Promise.all(invoicePromises);
            const populatedInvoices = await Invoice.populate(invoices, [
                { path: "user", select: "first_name last_name phone" },
                {
                    path: "invoice_detail",
                    populate: {
                        path: "meter",
                        select: "code_meter note",
                    },
                },
            ]);

            return res.status(200).json({
                data: populatedInvoices,
                message: "Invoices generated successfully",
            });
        } catch (error) {
            console.error("Error generating invoices:", error);
            return res.status(500).json({
                message: "Failed to generate invoices",
                error: error.message,
            });
        }
    },

    deleteAllInvoices: async (req, res) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Step 1: Delete all InvoiceDetail documents
            const deletedInvoiceDetails = await InvoiceDetail.deleteMany(
                {},
                { session }
            );

            // Step 2: Delete all Invoice documents
            const deletedInvoices = await Invoice.deleteMany({}, { session });

            // Step 3: Update User documents to remove references to deleted invoices
            const updatedUsers = await User.updateMany(
                { invoices: { $exists: true } },
                { $set: { invoices: [] } },
                { session }
            );

            // Step 4: Update Meter documents to remove references to deleted invoice details
            const updatedMeters = await Meter.updateMany(
                { invoice_details: { $exists: true } },
                { $set: { invoice_details: [] } },
                { session }
            );

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();

            return res.status(200).json({
                message:
                    "All invoices and related data have been deleted successfully",
                deletedInvoices: deletedInvoices.deletedCount,
                deletedInvoiceDetails: deletedInvoiceDetails.deletedCount,
                updatedUsers: updatedUsers.modifiedCount,
                updatedMeters: updatedMeters.modifiedCount,
            });
        } catch (error) {
            // If an error occurred, abort the transaction
            await session.abortTransaction();
            session.endSession();

            console.error("Error deleting invoices:", error);
            return res.status(500).json({
                message: "Failed to delete invoices and related data",
                error: error.message,
            });
        }
    },
};

module.exports = invoiceController;
