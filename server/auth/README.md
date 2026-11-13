# server/auth

## OTP xác thực email trường

`POST /api/auth/otp/request` nhận `{ "email": "student@university.edu.vn" }`.
`POST /api/auth/otp/verify` nhận `{ "email": "student@university.edu.vn", "otp": "123456" }`.
Hai API chỉ dùng được với session đang đăng nhập; `userId` luôn lấy từ session,
không nhận từ client. Origin phải khớp `APP_URL`.

Request chỉ chấp nhận domain có `domain_type = student` trong
`university_domains`. OTP sáu chữ số có hạn 5 phút, chỉ lưu HMAC-SHA256 dùng
`OTP_SECRET`, giới hạn 5 lần nhập sai và giới hạn gửi 60 giây theo user/email.
Email được gửi bằng `SMTP_URL` và `EMAIL_FROM`. Xác thực thành công cập nhật
tài khoản guest thành student trong transaction, liên kết email/trường và tạo
hồ sơ student nếu chưa có.

Response thành công request gồm `message` và `expiresInSeconds`; verify trả
`user` và `message`. Lỗi trả `{ error, code }`. Cấu hình `OTP_SECRET` tối thiểu
32 byte cùng SMTP trước khi chạy demo.

## Hiện trạng auth khác

- `current-user.ts` đọc cookie `sivi_session`, băm token SHA-256 và tìm session chưa hết hạn để trả hồ sơ hiện tại cho Server Components.
- Google OAuth bằng `openid-client`; dùng helper của thư viện cho state, nonce, PKCE và kiểm tra token/JWKS: chưa triển khai.
- Route đăng nhập, đăng xuất chưa có; UI không gửi request tới endpoint chưa tồn tại.
- `requireUser` / `requireStudent` / `requireAdmin` chưa được kết nối với session.

OTP được triển khai nhưng cần có session hợp lệ để sử dụng. OAuth/đăng nhập và
đăng xuất vẫn chưa triển khai; hoàn tất các luồng đó trước khi bật xác thực từ
người dùng chưa có session.
