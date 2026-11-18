# SiVi

Nền tảng forum tìm roommate và review địa điểm cho sinh viên khu Làng Đại học.

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS + Ant Design
- PostgreSQL 17 + Drizzle ORM
- Laya Multilingual SystemOne API cho kiểm duyệt văn bản
- Upload ảnh local bằng `sharp`

## Cấu trúc

~~~text
app/                 # page + API route handler
components/          # UI, port dần từ branch an
server/              # business logic, Drizzle, auth, upload
ai-service/          # FastAPI skeleton
docs/                # kiến trúc, data model, diagram, vận hành, test
storage/             # ảnh local khi dev
tests/               # Vitest cho business rule
~~~

## Chạy local

~~~powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d postgres
npm ci
npm run db:migrate
npm run db:seed
npm run dev
~~~

`npm run db:seed` tạo dữ liệu demo cho hai trường UIT/HCMUS, ba domain email,
hai tài khoản sinh viên và hai bài mỗi loại (tìm roommate, review). Lệnh có thể
chạy lại để cập nhật dữ liệu demo và từ chối chạy khi `NODE_ENV=production`.

Mở http://localhost:3000.

## Deploy bằng Docker

```powershell
docker compose up -d --build --wait app
```

Image `sivi-app:local` chạy Next.js ở cổng `1416` và tự chạy migration
khi khởi động. PostgreSQL và ảnh tải lên dùng Docker volumes.
Khi đặt sau reverse proxy HTTPS, thêm `SIVI_PUBLIC_URL=https://ten-mien-cua-ban`
vào `.env` và đăng ký URL Google OAuth callback `/api/auth/google/callback`
trên cùng tên miền. Cấu hình Google OAuth, SMTP, OTP và khóa AI trong `.env`.
Container gọi Laya trên Docker host ở cổng 9002 theo mặc định. Đặt
`SIVI_DOCKER_LAYA_URL` khi Laya chạy trên máy khác.

## AI service

SiVi gọi trực tiếp Laya Multilingual qua `POST /v1/systemone`. Đặt `LAYA_URL` và
`LAYA_API_KEY` trong `.env`. Với Laya trên máy host ở cổng 9002, dùng
`LAYA_URL=http://127.0.0.1:9002`. Chạy `docker compose up -d postgres` để bật DB.
Xem [test kiểm duyệt](server/moderation/README.md) để chạy 10 bài mẫu qua API thật.

## Kiểm tra

~~~powershell
npm run lint
npm run typecheck
npm test
npm run build
Set-Location ai-service
uv run pytest
~~~

## Tài liệu

- [Kiến trúc](docs/architecture.md)
- [Đặc tả thiết kế gốc và phạm vi MVP](docs/THIET-KE-SIVI.md)
- [Data model](docs/data-model.md)
- [Diagram](docs/diagrams.md)
- [Vận hành](docs/operations.md)
- [Test plan](docs/testing.md)

## Trạng thái skeleton

Đã có:

- Next.js app tối thiểu + /api/health.
- Drizzle schema 14 bảng cốt lõi + session.
- FastAPI service skeleton.
- Docker Compose cho Postgres + AI.
- Docs kiến trúc/data model/diagram.

Chưa có:

- UI port từ branch an.
- Auth/OTP/session.
- CRUD posts/comments/votes/reports.
- Upload ảnh.
- Tính năng nghiệp vụ theo lộ trình P0 → P1 → P2.
