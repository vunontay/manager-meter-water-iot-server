const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    first_name: { type: String },
    last_name: { type: String },
    email: { type: String, required: true },
    phone: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    avatar: { type: String },
    role: {
        type: String,
        enum: ["admin", "user"],
        default: "user",
    },
    address: { type: mongoose.Schema.Types.ObjectId, ref: "Address" }, // Liên kết tới Address
    meters: [{ type: mongoose.Schema.Types.ObjectId, ref: "Meter" }], // Liên kết tới Meter
});

module.exports = mongoose.model("User", userSchema);
