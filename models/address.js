const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
    city: { type: String, required: true },
    district: { type: String, required: true },
    commune: { type: String, required: true },
    note: { type: String },
    more_info: { type: String },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Liên kết tới User
});

module.exports = mongoose.model("Address", addressSchema);
