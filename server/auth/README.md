# server/auth

Sẽ chứa:

- Google OAuth: state, nonce, JWKS.
- OTP email trường: hash, hạn 5 phút, tối đa 5 lần.
- Session cookie HttpOnly, Secure, SameSite.
- requireUser / requireStudent / requireAdmin.

Chưa port từ branch an; chỉ giữ skeleton.
