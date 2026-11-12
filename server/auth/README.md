# server/auth

Session và demo local:

- `current-user.ts` đọc cookie `sivi_session`, băm token SHA-256 và tìm session chưa hết hạn để trả hồ sơ hiện tại cho Server Components.
- Cookie chứa token ngẫu nhiên opaque, đặt `HttpOnly`, `SameSite=Lax`; database chỉ lưu SHA-256 token, user ID và hạn 30 ngày.
- `/api/auth/demo` tạo/lấy tài khoản guest/student/admin trong database; endpoint chỉ bật ngoài production.
- `/api/auth/logout` thu hồi session và xóa cookie.
- `/api/auth/otp/request` tạo yêu cầu OTP 5 phút; `/api/auth/otp/verify` giới hạn 5 lần sai và cập nhật vai trò cùng trường của user trong transaction. OTP local cố định là `123456`.
- Google OAuth bằng `openid-client`; dùng helper của thư viện cho state, nonce, PKCE và kiểm tra token/JWKS: chưa triển khai.
- `requireStudent`, guard báo cáo và `requireAdmin` dùng user từ session database; thao tác đặc quyền không nhận user ID từ request body.

OTP demo không gửi email thật. Không bật endpoint demo trong production; tích hợp Google OAuth/SMTP thật là phần việc riêng.
