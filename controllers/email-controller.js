const {
    sendAllUnpaidInvoiceEmailsService,
} = require("../libs/nodemailer/sendAllUnpaidInvoiceEmailsService");
const sendInvoiceEmailService = require("../libs/nodemailer/sendEmailService");

const emailController = {
    sendInvoiceEmail: async (req, res) => {
        try {
            const { invoiceId } = req.body;

            // Validate invoice ID
            if (!invoiceId) {
                return res.status(400).json({
                    message: "ID hóa đơn là bắt buộc",
                });
            }

            // Send invoice email
            const response = await sendInvoiceEmailService(invoiceId);

            return res.status(200).json({
                message: "Email hóa đơn đã được gửi thành công",
                data: {
                    messageId: response.messageId,
                    accepted: response.accepted,
                    rejected: response.rejected,
                },
            });
        } catch (error) {
            console.error("Invoice email sending error:", error);

            return res.status(500).json({
                message: "Gửi email hóa đơn thất bại",
                error: error.message,
            });
        }
    },

    sendAllUnpaidInvoiceEmails: async (req, res) => {
        try {
            const sendResults = await sendAllUnpaidInvoiceEmailsService();

            return res.status(200).json({
                message: "Email hóa đơn chưa thanh toán đã được xử lý",
                results: sendResults,
            });
        } catch (error) {
            console.error("Error sending unpaid invoice emails:", error);

            return res.status(500).json({
                message: "Gửi email hóa đơn chưa thanh toán thất bại",
                error: error.message,
            });
        }
    },
};

module.exports = emailController;
