const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const Invoice = require("../../models/invoice");

dotenv.config();

const sendAllUnpaidInvoiceEmailsService = async () => {
    try {
        // Dùng dynamic import() cho p-limit để giải quyết vấn đề ESM
        const { default: pLimit } = await import("p-limit");

        // Tìm tất cả hóa đơn chưa thanh toán
        const unpaidInvoices = await Invoice.find({ status: "init" })
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
                            select: "name address",
                        },
                    },
                ],
            });

        // Nếu không có hóa đơn chưa thanh toán, trả về kết quả
        if (unpaidInvoices.length === 0) {
            console.log("Không có hóa đơn chưa thanh toán.");
            return {
                totalInvoices: 0,
                sentInvoices: 0,
                failedInvoices: [],
            };
        }

        // Tạo transporter cho việc gửi email
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || "smtp.gmail.com",
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === "true",
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        // Giới hạn số lượng email gửi đồng thời
        const limit = pLimit(2); // Giới hạn 5 email gửi đồng thời

        // Kết quả gửi email
        const sendResults = {
            totalInvoices: unpaidInvoices.length,
            sentInvoices: 0,
            failedInvoices: [],
        };

        // Hàm gửi email cho mỗi hóa đơn
        const sendEmail = async (invoice) => {
            try {
                // Kiểm tra email của người dùng
                if (!invoice.user || !invoice.user.email) {
                    throw new Error(
                        "Không tìm thấy địa chỉ email của người dùng"
                    );
                }

                // Định dạng chi tiết hóa đơn
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

                // Tạo nội dung email
                const emailContent = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>Thông Báo Hóa Đơn Nước Chưa Thanh Toán</h2>
                        <p>Kính chào ${
                            invoice.user.fullName || "Quý Khách"
                        },</p>
                        
                        <p>Dưới đây là chi tiết hóa đơn tiêu thụ nước chưa thanh toán của bạn:</p>
                        
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
                                ${new Date(
                                    invoice.start_period
                                ).toLocaleDateString()} - 
                                ${new Date(
                                    invoice.end_period
                                ).toLocaleDateString()}
                            </p>
                            <p><strong>Tổng Lượng Nước Tiêu Thụ:</strong> ${
                                invoice.volume_consumed
                            } m³</p>
                            <p><strong>Tổng Số Tiền:</strong> ${Math.floor(
                                invoice.total_amount
                            ).toLocaleString()} VNĐ</p>

                            <p style="color: red; font-weight: bold;">CHƯA THANH TOÁN</p>
                        </div>

                        <p style="margin-top: 20px;">
                            Quý khách vui lòng thanh toán đúng hạn. 
                            Trân trọng cảm ơn!
                        </p>
                    </div>
                `;

                // Gửi email
                const mailOptions = {
                    from: '"Hệ Thống Quản Lý Nước" <noreply@example.com>',
                    to: invoice.user.email,
                    subject: `Hóa Đơn Nước Chưa Thanh Toán - Kỳ ${new Date(
                        invoice.start_period
                    ).toLocaleDateString()}`,
                    html: emailContent,
                };

                // Gửi email
                await transporter.sendMail(mailOptions);
                sendResults.sentInvoices++;
                console.log(`Gửi email thành công đến ${invoice.user.email}`);
            } catch (emailError) {
                sendResults.failedInvoices.push({
                    invoiceId: invoice._id,
                    userEmail: invoice.user?.email,
                    error: emailError.message,
                });
                console.error(
                    `Gửi email thất bại cho hóa đơn ${invoice._id}:`,
                    emailError
                );
            }
        };

        // Gửi email đồng thời với giới hạn
        await Promise.all(
            unpaidInvoices.map(
                (invoice) => limit(() => sendEmail(invoice)) // Sử dụng giới hạn đồng thời
            )
        );

        return sendResults;
    } catch (error) {
        console.error("Lỗi trong sendAllUnpaidInvoiceEmailsService:", error);
        throw error;
    }
};

module.exports = { sendAllUnpaidInvoiceEmailsService };
