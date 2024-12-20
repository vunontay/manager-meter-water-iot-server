const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
    {
        name: { type: String, required: true }, // Tên vị trí
        longitude: { type: Number, required: true }, // Kinh độ
        latitude: { type: Number, required: true }, // Vĩ độ
        note: { type: String }, // Ghi chú
    },
    {
        timestamps: true, // Tự động thêm createdAt và updatedAt
    }
);

module.exports = mongoose.model("Location", locationSchema);
