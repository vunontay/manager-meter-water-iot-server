const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cron = require("node-cron");

const authRoute = require("./routes/auth");
const userRoute = require("./routes/user");
const addressRoute = require("./routes/address");
const meterRoute = require("./routes/meter");
const locationRoute = require("./routes/location");
const measurementRoute = require("./routes/measurement");
const invoiceRoute = require("./routes/invoice");
const statsRoute = require("./routes/stats");
const emailRoute = require("./routes/email");
const { subscribeToTopic } = require("./libs/mqtt/subscribe");
const { autoSendMessage } = require("./utils/autoSendMessage");
const {
    sendAllUnpaidInvoiceEmailsService,
} = require("./libs/nodemailer/sendAllUnpaidInvoiceEmailsService");
const { publishMessage } = require("./libs/mqtt/public");

dotenv.config();
const app = express();

app.use(
    cors({
        origin: "*",
        credentials: true,
    })
);

// Kết nối MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Mongoose Connected!");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
};

// Kết nối DB
connectDB();

// Cấu hình middleware
app.use(cookieParser());
app.use(express.json());

// Đăng ký các route
app.use("/v1/auth", authRoute);
app.use("/v1/user", userRoute);
app.use("/v1/meter", meterRoute);
app.use("/v1/address", addressRoute);
app.use("/v1/location", locationRoute);
app.use("/v1/measurement", measurementRoute);
app.use("/v1/invoice", invoiceRoute);
app.use("/v1/stats", statsRoute);
app.use("/v1/email", emailRoute);
// Lắng nghe MQTT
app.listen(8000, () => {
    console.log(`Server listening on port 8000`);
    // Đảm bảo subscribe vào topic để nhận dữ liệu từ đồng hồ giả
    subscribeToTopic("server");

    // SET UP
    // publishMessage(
    //     "client",
    //     JSON.stringify({
    //         ids: [1, 2, 3],
    //     })
    // );

    // RESET
    // publishMessage(
    //     "client",
    //     JSON.stringify({
    //         id: 1,
    //         clear: 1,
    //     })
    // );

    // GET;
    // publishMessage(
    //     "client",
    //     JSON.stringify({
    //         get: 1,
    //     })
    // );

    // Tụ động gửi lược nước tiêu thụ
    cron.schedule("0 0 1,15 * *", () => {
        console.log(
            "Running scheduled task on the 1st and 15th of each month..."
        );
        autoSendMessage();
    });

    // Tự động gửi hóa đơn
    cron.schedule("0 8 * * *", () => {
        console.log("Running scheduled task to send unpaid invoices...");
        sendAllUnpaidInvoiceEmailsService();
    });
});
