const { client } = require("./mqtt");

const publishMessage = (topic, message) => {
    return new Promise((resolve) => {
        // Gửi message ngay lập tức
        const publish = () => {
            client.publish(topic, message, { qos: 1 }); // Sử dụng QoS 1 để đảm bảo message được gửi
            console.log("Published:", { topic, message });
        };

        publish();
        resolve();
    });
};

module.exports = { publishMessage };
