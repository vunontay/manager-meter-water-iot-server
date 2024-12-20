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
                    message: "Invoice ID is required",
                });
            }

            // Send invoice email
            const response = await sendInvoiceEmailService(invoiceId);

            return res.status(200).json({
                message: "Invoice email sent successfully",
                data: {
                    messageId: response.messageId,
                    accepted: response.accepted,
                    rejected: response.rejected,
                },
            });
        } catch (error) {
            console.error("Invoice email sending error:", error);

            return res.status(500).json({
                message: "Failed to send invoice email",
                error: error.message,
            });
        }
    },

    sendAllUnpaidInvoiceEmails: async (req, res) => {
        try {
            const sendResults = await sendAllUnpaidInvoiceEmailsService();

            return res.status(200).json({
                message: "Unpaid invoice emails processed",
                results: sendResults,
            });
        } catch (error) {
            console.error("Error sending unpaid invoice emails:", error);

            return res.status(500).json({
                message: "Failed to send unpaid invoice emails",
                error: error.message,
            });
        }
    },
};

module.exports = emailController;
