import nodemailer from 'nodemailer';
import { HttpError } from '@/lib/http';

export async function sendStudentOtp(email: string, otp: string): Promise<void> {
  if (!process.env.SMTP_URL || !process.env.EMAIL_FROM) {
    throw new HttpError(503, 'Dịch vụ gửi email chưa được cấu hình.');
  }
  const transport = nodemailer.createTransport({
    url: process.env.SMTP_URL,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Mã xác thực sinh viên SiVi',
    text: `Mã xác thực của bạn là ${otp}. Mã có hiệu lực trong 5 phút. Nếu bạn không yêu cầu mã này, hãy bỏ qua email.`,
  });
}
