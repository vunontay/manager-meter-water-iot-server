const { client } = require("./libs/mqtt/mqtt");

// Array to store meter ids
let meterIds = [];

// Function to generate random water meter data
const generateWaterMeterData = (meterId) => {
    return {
        id: meterId,
        data: [
            Math.floor(Math.random() * 1000), // Water consumption (liters)
            Math.floor(Math.random() * 100), // Flow rate (liters/minute)
            1, // Status (1 = OK)
        ],
    };
};

// Simulate sending fake data for a meter
const sendFakeData = (meterId) => {
    // Chuyển đổi meterId về số nguyên và kiểm tra trùng lặp chặt chẽ hơn
    const meterIdInt = Number(meterId);

    // Chỉ thêm nếu chưa tồn tại và là số nguyên hợp lệ
    if (!meterIds.includes(meterIdInt) && !isNaN(meterIdInt)) {
        meterIds.push(meterIdInt);
    }

    // Generate fake water meter data
    const meterData = generateWaterMeterData(meterIdInt);

    // Prepare the response data matching ESP32 format
    const response = {
        ids: meterIds, // Array of all meterIds
        lengthId: meterIds.length, // Count of meterIds
    };

    // Send meter data to server
    client.publish("server", JSON.stringify(meterData));

    console.log(`Fake data sent to server:`, meterData);
    console.log(`Meter IDs:`, response);
};

// Handle SET UP request
const handleSetUp = (message) => {
    const { ids } = JSON.parse(message.toString());
    if (ids && Array.isArray(ids)) {
        ids.forEach((id) => sendFakeData(id)); // Send fake data for each meterId
    } else {
        console.log("Invalid SET UP message format.");
    }
};

// Handle RESET request
const handleReset = (message) => {
    const { id, clear } = JSON.parse(message.toString());
    if (id && clear === 1) {
        console.log(`Resetting data for meter ${id}`);
        // Remove specific meter ID or reset its data if needed
        const index = meterIds.indexOf(id);
        if (index > -1) {
            meterIds.splice(index, 1);
        }
    } else {
        console.log("Invalid RESET message format.");
    }
};

// Handle GET request
const handleGet = (message) => {
    const { id } = JSON.parse(message.toString());
    if (id) {
        console.log(
            `GET request received for meter ${id}. Sending fake data...`
        );
        sendFakeData(id);
    } else {
        console.log("Invalid GET message format.");
    }
};

// MQTT Client Event - Connection Established
client.on("connect", () => {
    console.log("Fake Water Meter connected to MQTT broker");

    // Subscribe to client topic to listen for requests
    client.subscribe("client", (err) => {
        if (err) {
            console.log("Failed to subscribe to topic client");
        } else {
            console.log("Subscribed to client topic");
        }
    });
});

// MQTT Client Event - Message Received
client.on("message", (topic, message) => {
    if (topic === "client") {
        console.log("Received request from client:", message.toString());

        // Determine action based on message content
        const parsedMessage = JSON.parse(message.toString());

        if (parsedMessage.ids) {
            handleSetUp(message);
        } else if (parsedMessage.id && parsedMessage.clear !== undefined) {
            handleReset(message);
        } else if (parsedMessage.id) {
            handleGet(message);
        } else {
            console.log("Invalid request format.");
        }
    }
});
