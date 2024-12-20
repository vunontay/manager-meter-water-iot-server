const mongoose = require("mongoose");

const invoiceDetailSchema = new mongoose.Schema({
    invoice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invoice",
        required: true,
    }, // Liên kết tới Invoice
    meter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Meter",
        required: true,
    }, // Liên kết tới Meter
    price_per_unit: { type: Number, required: true }, // Giá mỗi đơn vị nước (VNĐ/m³)
});

module.exports = mongoose.model("InvoiceDetail", invoiceDetailSchema);
