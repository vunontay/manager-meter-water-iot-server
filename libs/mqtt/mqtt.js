const mqtt = require("mqtt");
const dotenv = require("dotenv");
dotenv.config();
// Cấu hình MQTT Client
const options = {
    host: process.env.MQTT_HOST,
    port: process.env.MQTT_PORT,
    protocol: process.env.MQTT_PROTOCOL,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
};

// Khởi tạo MQTT client (chỉ khởi tạo một lần)
const client = mqtt.connect(options);

// Callback khi kết nối thành công
client.on("connect", function () {
    console.log("Connected to MQTT broker!");
});

// Callback khi có lỗi
client.on("error", function (error) {
    console.log("MQTT Error:", error);
});

// Export client để sử dụng ở các module khác
module.exports = { client };
