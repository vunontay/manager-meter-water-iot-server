const Meter = require("../models/meter");
const { publishMessage } = require("../libs/mqtt/public");

const autoSendMessage = async () => {
    try {
        const meters = await Meter.find({}, "code_meter");

        if (!meters || meters.length === 0) {
            return res.status(404).json({ message: "Meters not found" });
        }
        const meterIds = meters.map((meter, index) => Number(meter.code_meter));

        // Gửi thông điệp đến MQTT với các meterIds (chỉ số)
        publishMessage(
            "client", // Topic gửi đi
            JSON.stringify({
                ids: meterIds, // Mảng các chỉ số
            })
        );
    } catch (error) {
        console.error("Error sending request via MQTT:", error.message);
    }
};

module.exports = { autoSendMessage };
