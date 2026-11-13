# AUTH-01

## Cấu hình Google

- Điền `APP_URL`, `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET` trong `.env` ở máy chạy Next.js.
- Tạo OAuth client loại **Web application**. Đăng ký chính xác redirect URI `APP_URL + /api/auth/google/callback`. Ví dụ local dùng `http://localhost:3000/api/auth/google/callback`.
- Mở app bằng đúng origin trong `APP_URL` để trình duyệt gửi cookie ở callback. Dùng HTTPS khi triển khai. HTTP hỗ trợ localhost và địa chỉ loopback.
- Nếu OAuth consent đang ở chế độ test, thêm tài khoản thử vào danh sách test users của dự án Google Cloud.

## Dùng từ trang và route

- Nút đăng nhập mở `GET /api/auth/google`. Callback đưa trình duyệt về `/`. Khi người dùng hủy hoặc xác thực thất bại, trang nhận `/?authError=google_login_failed`.
- Đăng xuất bằng `POST /api/auth/logout` cùng origin. Route trả `{ ok: true }` và hủy session hiện tại. UI có thể gọi `router.refresh()` sau khi thành công.
- Server Components dùng `await getCurrentUser()` trong `server/auth/service.ts`. Route handlers có thể truyền `request` vào hàm này. Hàm trả user hoặc `null`. Đọc trạng thái từ DB để thay đổi role có hiệu lực với phiên hiện tại.
- Các guard `requireUser(request?)`, `requireStudent(request?)`, `requireAdmin(request?)` trả user hoặc ném `ForumError` với `UNAUTHENTICATED` (401) / `FORBIDDEN` (403). Route báo cáo có thể dùng `requireStudent(request)` và ánh xạ lỗi sang contract của report.

Google OIDC dùng Authorization Code Flow, state, nonce, PKCE S256 và xác minh chữ ký ID token qua JWKS. Liên kết user theo Google `sub`. Email Google xác thực dùng cho hồ sơ đăng nhập. Sinh viên được xác thực qua AUTH-02.

Tài khoản mới mặc định là guest. `ADMIN_EMAILS` có thể cấp vai trò admin khi đăng nhập bằng Gmail hoặc tài khoản Google Workspace có claim `hd`. Vai trò đã cấp được lưu trong DB. Để thu hồi quyền admin, gỡ email khỏi allowlist và cập nhật role trong DB.

Phiên hết hạn sau 30 ngày. DB lưu SHA-256 của token ngẫu nhiên. Cookie `sivi_session` dùng cho HTTP loopback. HTTPS dùng `__Host-sivi_session`. Cả hai dùng HttpOnly, SameSite=Lax và Path=/, với Secure trên HTTPS.

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
