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
                if (volume <= 10) return 5973;
                if (volume <= 20) return 7052;
                if (volume <= 30) return 8669;
                if (volume <= 40) return 10239;
                return 11615;
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
                                        $gte: startDate,
                                        $lte: endDate,
                                    },
                                },
                            },
                            {
                                $sort: { timestamp: -1 }, // Sắp xếp theo thời gian giảm dần
                            },
                            {
                                $limit: 1, // Chỉ lấy bản ghi mới nhất
                            },
                        ],
                        as: "latestMeasurement",
                    },
                },
                {
                    $unwind: "$latestMeasurement", // Bỏ qua những meter không có dữ liệu
                },
                {
                    $project: {
                        code_meter: 1,
                        user: 1,
                        installation_date: 1,
                        latestVolume: "$latestMeasurement.volume",
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

                const pricePerUnit = getPricePerUnit(meterData.latestVolume);
                const totalAmount = meterData.latestVolume * pricePerUnit;

                userInvoices[userId].totalVolume += meterData.latestVolume;
                userInvoices[userId].totalAmount += totalAmount;

                userInvoices[userId].invoiceDetail.push({
                    meter: meterData._id,
                    price_per_unit: pricePerUnit,
                    volume: meterData.latestVolume,
                    total_amount: totalAmount,
                });
            }

            const limit = pLimit(5);
            const invoicePromises = Object.values(userInvoices).map(
                (userInvoice) =>
                    limit(async () => {
                        const existingInvoice = await Invoice.findOne({
                            user: userInvoice.user,
                            start_period: userInvoice.start_period,
                            end_period: userInvoice.end_period,
                        });

                        if (!existingInvoice) {
                            const newInvoice = new Invoice({
                                user: userInvoice.user,
                                start_period: userInvoice.start_period,
                                end_period: userInvoice.end_period,
                                volume_consumed: userInvoice.totalVolume,
                                total_amount: userInvoice.totalAmount,
                                status: "init",
                            });

                            const invoiceDetailsToSave = [];

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

                            if (invoiceDetailsToSave.length > 0) {
                                await InvoiceDetail.insertMany(
                                    invoiceDetailsToSave
                                );
                                newInvoice.invoice_detail.push(
                                    ...invoiceDetailsToSave.map((d) => d._id)
                                );
                            }

                            await newInvoice.save();
                            return newInvoice;
                        } else {
                            existingInvoice.volume_consumed =
                                userInvoice.totalVolume;
                            existingInvoice.total_amount =
                                userInvoice.totalAmount;

                            const invoiceDetailsToUpdate = [];

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

                            if (invoiceDetailsToUpdate.length > 0) {
                                await InvoiceDetail.insertMany(
                                    invoiceDetailsToUpdate
                                );
                                existingInvoice.invoice_detail.push(
                                    ...invoiceDetailsToUpdate.map((d) => d._id)
                                );
                            }

                            await existingInvoice.save();
                            return existingInvoice;
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
                message: "Hóa đơn đã được tạo thành công",
            });
        } catch (error) {
            console.error("Error generating invoices:", error);
            return res.status(500).json({
                message: "Tạo hóa đơn thất bại",
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
                    "Tất cả hóa đơn và dữ liệu liên quan đã được xóa thành công",
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
                message: "Xóa hóa đơn và dữ liệu liên quan thất bại",
                error: error.message,
            });
        }
    },
};

module.exports = invoiceController;
