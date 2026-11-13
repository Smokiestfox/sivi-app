# Vận hành & triển khai SiVi

**Mô hình demo:** PostgreSQL và AI trong Docker Compose; Next.js chạy trên máy host.

## 1. Môi trường

| Thành phần | Cách chạy |
|---|---|
| Next.js | `npm run dev` trên máy host |
| PostgreSQL | Docker Compose, cổng 5432 |
| AI | Docker Compose, cổng 8100 |
| Ảnh | Thư mục `storage/` trên máy host |

## 2. Biến môi trường

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| APP_URL | Có | `http://localhost:3000`, dùng cho OAuth callback, cookie, Origin |
| DATABASE_URL | Có | Chuỗi kết nối PostgreSQL |
| GOOGLE_CLIENT_ID | Có | OAuth client |
| GOOGLE_CLIENT_SECRET | Có | OAuth secret |
| ADMIN_EMAILS | Có | Danh sách email admin, phân tách bằng dấu phẩy |
| SMTP_URL | Có | SMTP gửi OTP |
| EMAIL_FROM | Có | Địa chỉ gửi |
| OTP_SECRET | Có | Khóa bí mật tối thiểu 32 byte để HMAC mã OTP |
| AI_MODERATION_URL | Có | URL Python AI service |
| AI_MODERATION_API_KEY | Không | Bearer token nếu AI service yêu cầu |
| STORAGE_DIR | Có | Thư mục ảnh local |
| MAX_UPLOAD_BYTES | Không | Mặc định 5 MB |

Không commit .env. .env.example chỉ chứa giá trị mẫu.
Tạo `OTP_SECRET` bằng `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
Trong Google Cloud Console, đăng ký redirect URI `http://localhost:3000/api/auth/google/callback` khi chạy local.

## 3. Local

~~~powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d
npm ci
npm run db:migrate
npm run dev
~~~

Kiểm tra:

~~~bash
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:8100/health
~~~

## 4. Database

- PostgreSQL 17.
- Migration bằng drizzle-kit; mọi thay đổi schema đi kèm migration.
- Không chạy migration tự động trong request.

## 5. AI service

- Chạy container FastAPI, cổng nội bộ 8100.
- Health: GET /health.
- Model Laya load lúc khởi động; nếu load lỗi, container không healthy.
- Timeout phía Next: 10 giây.
- AI lỗi/timeout: fail closed, trả 503, không lưu bài.
- Log request id, model version, latency, kết quả policy.
- Không log toàn bộ nội dung người dùng ở production.

## 6. Ảnh

- Dùng `STORAGE_DIR` (mặc định `./storage`).
- Tên file UUID, không dùng tên gốc.
- Resize tối đa 1600px, strip EXIF.
- Chỉ JPEG/PNG/WebP, tối đa 5 MB.
- Xóa file khi xóa bài hoặc bỏ ảnh.

## 7. Session & rate limit

- Session lưu DB, token hash, hết hạn 30 ngày.
- Xóa session hết hạn theo tác vụ bảo trì thủ công; không cần thêm cron/job queue cho demo.
- Rate limit:
  - OTP: 60 giây/user, 60 giây/email.
  - Post/comment: 10 request/5 phút/user.
  - Report: 20 request/giờ/user.
- Không thêm Redis; giới hạn OTP được thực hiện trong ứng dụng và DB.

## 8. Logging & health

- Request id cho mỗi request.
- Log JSON: level, requestId, userId, route, status, latency.
- Không log cookie, OTP, token, nội dung nhạy cảm.
- Health:
  - /api/health: web sống.
  - /api/health/db: DB kết nối được.
  - AI /health: model sẵn sàng.
- Cảnh báo khi 5xx tăng hoặc AI timeout tăng.

## 9. Mở rộng sau demo

Chỉ nếu giảng viên yêu cầu truy cập online, bổ sung VPS, HTTPS/reverse proxy, backup DB và lưu trữ bền vững. Không cần triển khai các thành phần này để phát triển hoặc demo local.
