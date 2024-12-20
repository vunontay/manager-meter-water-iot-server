const { client } = require("./mqtt");

// Function để publish thông điệp vào một topic
const publishMessage = (topic, message) => {
    return new Promise((resolve, reject) => {
        client.publish(topic, message, (err) => {
            if (err) {
                reject(
                    new Error(
                        `Failed to publish message to topic ${topic}: ${err.message}`
                    )
                );
            } else {
                resolve(`Message published to topic ${topic}`);
            }
        });
    });
};

module.exports = { publishMessage };
