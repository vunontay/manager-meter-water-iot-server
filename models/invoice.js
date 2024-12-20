const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }, // Liên kết tới User
    start_period: { type: Date, required: true }, // Kỳ bắt đầu
    end_period: { type: Date, required: true }, // Kỳ kết thúc
    volume_consumed: { type: Number, default: 0 }, // Tổng nước tiêu thụ
    total_amount: { type: Number, default: 0 }, // Tổng tiền
    status: { type: String, enum: ["init", "paid", "unpaid"], default: "init" },
    invoice_detail: [
        { type: mongoose.Schema.Types.ObjectId, ref: "InvoiceDetail" },
    ], // Liên kết tới InvoiceDetail
});

module.exports = mongoose.model("Invoice", invoiceSchema);
