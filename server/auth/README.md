# server/auth

Hiện trạng:

- `current-user.ts` đọc cookie `sivi_session`, băm token SHA-256 và tìm session chưa hết hạn để trả hồ sơ hiện tại cho Server Components.
- Google OAuth bằng `openid-client`; dùng helper của thư viện cho state, nonce, PKCE và kiểm tra token/JWKS: chưa triển khai.
- OTP email trường: hash, hạn 5 phút, tối đa 5 lần: chưa triển khai.
- Route đăng nhập, xác thực OTP và đăng xuất chưa có; UI không gửi request tới endpoint chưa tồn tại.
- `requireUser` / `requireStudent` / `requireAdmin` chưa được kết nối với session.

OTP và session do ứng dụng tự quản lý theo kiến trúc. Cần hoàn tất auth backend trước khi bật các luồng đăng nhập và xác thực sinh viên.
