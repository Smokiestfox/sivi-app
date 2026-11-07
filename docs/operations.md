# Vận hành & triển khai SiVi

**Trạng thái:** chưa chốt  
**Mô hình:** VPS + Next.js + PostgreSQL + Python AI service.

## 1. Môi trường

| Môi trường | Web | Database | AI | Storage |
|---|---|---|---|---|
| Local | npm run dev | Docker Postgres | Docker AI | storage/ |
| Staging | Next start | Postgres VPS | AI container | storage/ |
| Production | Next start | Postgres VPS | AI container | S3/MinIO |

## 2. Biến môi trường

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| APP_URL | Có | URL gốc, dùng cho OAuth callback, cookie, Origin |
| DATABASE_URL | Có | Chuỗi kết nối PostgreSQL |
| GOOGLE_CLIENT_ID | Có | OAuth client |
| GOOGLE_CLIENT_SECRET | Có | OAuth secret |
| ADMIN_EMAILS | Có | Danh sách email admin, phân tách bằng dấu phẩy |
| SMTP_URL | Có | SMTP gửi OTP |
| EMAIL_FROM | Có | Địa chỉ gửi |
| AI_MODERATION_URL | Có | URL Python AI service |
| AI_MODERATION_API_KEY | Không | Bearer token nếu AI service yêu cầu |
| STORAGE_DIR | Có | Thư mục ảnh local |
| MAX_UPLOAD_BYTES | Không | Mặc định 5 MB |

Không commit .env. .env.example chỉ chứa giá trị mẫu.

## 3. Local

~~~bash
cp .env.example .env
docker compose up -d postgres ai
npm ci
npm run db:migrate
npm run dev
~~~

Kiểm tra:

~~~bash
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:8100/health
~~~

## 4. Production trên VPS

Topology:

~~~text
Internet
  │ HTTPS
  ▼
Caddy / Nginx
  ├── Next.js :3000
  ├── PostgreSQL :5432 (nội bộ)
  ├── AI service :8100 (nội bộ)
  └── storage/ hoặc S3
~~~

- Caddy/Nginx làm TLS và reverse proxy.
- Next.js chạy bằng systemd hoặc PM2.
- PostgreSQL và AI service chạy bằng Docker Compose.
- Không mở PostgreSQL/AI ra Internet.

### 4.1. Deploy web

~~~bash
git pull
npm ci
npm run db:migrate
npm run build
sudo systemctl restart sivi-web
~~~

Unit systemd:

~~~ini
[Unit]
Description=SiVi Next.js
After=network.target

[Service]
WorkingDirectory=/srv/sivi
EnvironmentFile=/srv/sivi/.env
ExecStart=/usr/bin/npm run start
Restart=always
User=sivi

[Install]
WantedBy=multi-user.target
~~~

### 4.2. Caddy

~~~text
sivi.example.com {
  encode gzip
  reverse_proxy 127.0.0.1:3000
}
~~~

## 5. Database

- PostgreSQL 17.
- Migration bằng drizzle-kit, không sửa tay schema production.
- Trước migration: backup.
- Migration phải idempotent hoặc có rollback plan.
- Không chạy migration tự động trong request.

Backup:

~~~bash
pg_dump "$DATABASE_URL" -Fc -f sivi-$(date +%F).dump
~~~

Restore:

~~~bash
pg_restore --clean --if-exists -d "$DATABASE_URL" sivi-YYYY-MM-DD.dump
~~~

## 6. AI service

- Chạy container FastAPI, cổng nội bộ 8100.
- Health: GET /health.
- Model Laya load lúc khởi động; nếu load lỗi, container không healthy.
- Timeout phía Next: 10 giây.
- AI lỗi/timeout: fail closed, trả 503, không lưu bài.
- Log request id, model version, latency, kết quả policy.
- Không log toàn bộ nội dung người dùng ở production.

## 7. Ảnh

- Local: STORAGE_DIR, volume persistent.
- Production: S3/MinIO.
- Tên file UUID, không dùng tên gốc.
- Resize tối đa 1600px, strip EXIF.
- Chỉ JPEG/PNG/WebP, tối đa 5 MB.
- Xóa file khi xóa bài hoặc bỏ ảnh.
- Backup bucket/volume theo lịch.

## 8. Session & rate limit

- Session lưu DB, token hash, hết hạn 30 ngày.
- Cron xóa session hết hạn mỗi ngày.
- Rate limit:
  - OTP: 60 giây/user, 60 giây/email.
  - Post/comment: 10 request/5 phút/user.
  - Report: 20 request/giờ/user.
- Rate limit lưu Redis hoặc bảng DB; MVP dùng bảng DB nếu chưa có Redis.

## 9. Logging & health

- Request id cho mỗi request.
- Log JSON: level, requestId, userId, route, status, latency.
- Không log cookie, OTP, token, nội dung nhạy cảm.
- Health:
  - /api/health: web sống.
  - /api/health/db: DB kết nối được.
  - AI /health: model sẵn sàng.
- Cảnh báo khi 5xx tăng hoặc AI timeout tăng.

## 10. Security headers

Caddy/Nginx hoặc Next headers:

- Content-Security-Policy.
- Strict-Transport-Security.
- X-Content-Type-Options: nosniff.
- Referrer-Policy: strict-origin-when-cross-origin.
- X-Frame-Options: DENY.
- Permissions-Policy tối thiểu.

## 11. Rollback

1. Giữ build trước đó.
2. Nếu lỗi app: symlink hoặc service về build cũ.
3. Nếu lỗi migration: restore backup, không rollback schema bằng tay.
4. Ghi incident note.

## 12. Vấn đề mở

1. Chốt dùng systemd hay PM2.
2. Chốt S3 hay MinIO cho production.
3. Có cần web container trong Docker Compose không, hay giữ Next start trên host.
4. Chốt nhà cung cấp VPS và cấu hình CPU/RAM cho Laya.
