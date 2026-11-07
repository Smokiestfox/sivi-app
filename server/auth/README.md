# server/auth

Sẽ chứa:

- Google OAuth bằng `openid-client`; dùng helper của thư viện cho state, nonce, PKCE và kiểm tra token/JWKS.
- OTP email trường: hash, hạn 5 phút, tối đa 5 lần.
- Session cookie HttpOnly, Secure, SameSite.
- requireUser / requireStudent / requireAdmin.

OTP và session do ứng dụng tự quản lý. Chưa port từ branch an; chỉ giữ skeleton.
