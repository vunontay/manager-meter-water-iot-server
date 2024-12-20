const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const Invoice = require("../../models/invoice");

dotenv.config();

const sendInvoiceEmailService = async (invoiceId) => {
    try {
        // Find the invoice and populate related data
        const invoice = await Invoice.findById(invoiceId)
            .populate({
                path: "user",
                select: "email fullName",
            })
            .populate({
                path: "invoice_detail",
                populate: [
                    {
                        path: "meter",
                        select: "code_meter status",
                        populate: {
                            path: "location",
                            select: "name address", // Adjust based on your Location model
                        },
                    },
                ],
            });

        // Validate invoice exists
        if (!invoice) {
            throw new Error("Invoice not found");
        }

        // Validate user email
        if (!invoice.user || !invoice.user.email) {
            throw new Error("No email address found for the user");
        }

        // Format invoice details
        const invoiceDetails = invoice.invoice_detail
            .map((detail) => {
                const locationInfo = detail.meter.location
                    ? `${detail.meter.location.name || "N/A"} (${
                          detail.meter.location.address || "N/A"
                      })`
                    : "N/A";

                return `
                <tr>
                    <td>${detail.meter.code_meter || "N/A"}</td>
                    <td>${locationInfo}</td>
                    <td>${detail.price_per_unit.toLocaleString()} VNĐ/m³</td>
                    <td>${detail.meter.status || "N/A"}</td>
                </tr>
            `;
            })
            .join("");

        // Create email content
        const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto;">
                <h2>Thông Báo Hóa Đơn Nước</h2>
                <p>Kính chào ${invoice.user.fullName || "Quý Khách"},</p>
                
                <p>Dưới đây là chi tiết hóa đơn tiêu thụ nước của bạn:</p>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="border: 1px solid #ddd; padding: 8px;">Mã Đồng Hồ</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">Vị Trí</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">Đơn Giá</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">Trạng Thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoiceDetails}
                    </tbody>
                </table>

                <div style="margin-top: 15px;">
                    <p><strong>Kỳ Thanh Toán:</strong> 
                        ${new Date(invoice.start_period).toLocaleDateString()} 
                        - 
                        ${new Date(invoice.end_period).toLocaleDateString()}
                    </p>
                    <p><strong>Tổng Lượng Nước Tiêu Thụ:</strong> ${
                        invoice.volume_consumed
                    } m³</p>
                    <p><strong>Tổng Số Tiền:</strong> ${invoice.total_amount.toLocaleString()} VNĐ</p>
                    <p><strong>Trạng Thái:</strong> 
                        ${
                            invoice.status === "init"
                                ? "Chưa Thanh Toán"
                                : invoice.status === "paid"
                                ? "Đã Thanh Toán"
                                : "Quá Hạn"
                        }
                    </p>
                </div>

                <p style="margin-top: 20px;">
                    Quý khách vui lòng thanh toán đúng hạn. 
                    Trân trọng cảm ơn!
                </p>
            </div>
        `;

        // Create transporter (remains the same as before)
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || "smtp.gmail.com",
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === "true",
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        // Send email
        const mailOptions = {
            from:
                process.env.EMAIL_FROM ||
                '"Hệ Thống Quản Lý Nước" <noreply@example.com>',
            to: invoice.user.email,
            subject: `Hóa Đơn Nước - Kỳ ${new Date(
                invoice.start_period
            ).toLocaleDateString()}`,
            html: emailContent,
        };

        const info = await transporter.sendMail(mailOptions);

        console.log(
            `Invoice email sent to ${invoice.user.email}. Message ID: ${info.messageId}`
        );
        return info;
    } catch (error) {
        console.error("Error in sendInvoiceEmailService:", error);
        throw error;
    }
};

module.exports = sendInvoiceEmailService;
