const Measurement = require("../../models/measurement"); // Import model Measurement
const Meter = require("../../models/meter"); // Import model Meter

async function saveMeterData(data) {
    console.log(data);
    // Kiểm tra nếu là thông báo online
    if (data?.onl === 1) {
        console.log("Device is online");
        return;
    }

    if (data?.data[0] === undefined) {
        return;
    }

    const meterId = data?.id; // Lấy id từ dữ liệu nhận được (index từ MQTT)
    // Chuyển đổi từ lít sang m³
    const volumeInLiters = parseFloat(data?.data[0]); // 0.67L
    const volumeInCubicMeters = volumeInLiters / 1000; // Chuyển sang m³

    const flow = parseFloat(data?.data[1]); // Lưu lượng (flow)
    const status = parseInt(data?.data[2]); // Trạng thái (status)

    try {
        // Tìm Meter với mã đồng hồ đã tạo
        let meter = await Meter.findOne({
            code_meter: meterId.toString(), // Tìm theo mã đồng hồ đã tạo
        });
        // Kiểm tra nếu không tìm thấy Meter
        if (!meter) {
            console.log(`Không tìm thấy đồng hồ với mã ${meterId}`);
            return; // Nếu không tìm thấy Meter, bỏ qua
        }

        // Kiểm tra nếu `meter_id` hợp lệ (Không phải null)
        if (!meter._id) {
            console.log(`Mã đồng hồ ${meterId} không hợp lệ`);
            return; // Nếu `meter_id` là null, bỏ qua
        }

        // Tạo mới bản ghi Measurement
        const measurement = new Measurement({
            meter: meter._id, // Liên kết với Meter bằng ObjectId
            code_meter: meterId.toString(), // Mã đồng hồ
            flow: flow,
            volume: volumeInCubicMeters, // Lưu giá trị đã chuyển đổi sang m³
        });

        // Lưu Measurement vào MongoDB
        await measurement.save();

        // Cập nhật mảng `measurements` trong Meter
        meter.measurements.push(measurement._id);
        await meter.save();
    } catch (error) {
        console.error("Lỗi lưu dữ liệu đồng hồ:", error.message);
    }
}

module.exports = saveMeterData;
