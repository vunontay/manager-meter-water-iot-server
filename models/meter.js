const mongoose = require("mongoose");

const meterSchema = new mongoose.Schema({
    code_meter: { type: String, required: true, unique: true },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }, // Liên kết tới User
    location: { type: mongoose.Schema.Types.ObjectId, ref: "Location" }, // Liên kết tới Location
    installation_date: { type: Date, default: Date.now }, // Ngày lắp đặt
    status: {
        type: String,
        enum: ["active", "inactive", "maintenance", "initial"],
        default: "initial",
    },
    measurements: [
        {
            ref: "Measurement",
            type: mongoose.Schema.Types.ObjectId,
        },
    ],

    note: { type: String },
});

module.exports = mongoose.model("Meter", meterSchema);
