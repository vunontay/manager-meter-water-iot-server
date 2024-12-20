const mongoose = require("mongoose");

const measurementSchema = new mongoose.Schema({
    meter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Meter",
        required: true,
    },
    code_meter: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    flow: {
        type: Number,
        required: true,
    },
    volume: {
        type: Number,
        required: true,
    },
});

module.exports = mongoose.model("Measurement", measurementSchema);
