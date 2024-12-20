const { client } = require("./mqtt");
const saveMeterData = require("./saveMeterData");

// Callback when receiving a message
client.on("message", function (topic, message) {
    console.log(`Received message from topic ${topic}: ${message.toString()}`);
    const data = JSON.parse(message.toString());
    console.log(data);
    // Save the data to the database
    // saveMeterData(data);
});

// Function to subscribe to a topic
const subscribeToTopic = (topic) => {
    client.subscribe(topic, (err) => {
        if (err) {
            console.log(`Failed to subscribe to topic: ${topic}`);
        } else {
            console.log(`Subscribed to topic: ${topic}`);
        }
    });
};

module.exports = { subscribeToTopic };
