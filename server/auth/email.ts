import { createTransport } from "nodemailer";
import { OtpError } from "./errors";

export function prepareOtpEmail(to: string, otp: string): () => Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  const from = process.env.EMAIL_FROM;
  if (!smtpUrl || !from) {
    throw new OtpError(503, "EMAIL_NOT_CONFIGURED", "Dịch vụ gửi email chưa được cấu hình.");
  }

  let transport: ReturnType<typeof createTransport>;
  try {
    transport = createTransport(smtpUrl);
  } catch {
    throw new OtpError(503, "EMAIL_NOT_CONFIGURED", "Cấu hình SMTP không hợp lệ.");
  }

  return async () => {
    await transport.sendMail({
      from,
      to,
      subject: "Mã xác thực email sinh viên SiVi",
      text: `Mã xác thực của bạn là ${otp}. Mã có hiệu lực trong 5 phút. Nếu bạn không yêu cầu mã này, hãy bỏ qua email.`,
      html: `<p>Mã xác thực email sinh viên của bạn là:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otp}</p><p>Mã có hiệu lực trong 5 phút. Nếu bạn không yêu cầu mã này, hãy bỏ qua email.</p>`,
    });
  };
}
