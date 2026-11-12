# SiVi

Nền tảng forum tìm roommate và review địa điểm cho sinh viên khu Làng Đại học.

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS + Ant Design
- PostgreSQL 17 + Drizzle ORM
- Python FastAPI cho AI moderation
- Upload ảnh local bằng `sharp`

## Cấu trúc

~~~text
app/                 # page + API route handler
components/          # UI, port dần từ branch an
server/              # business logic, Drizzle, auth, upload
ai-service/          # FastAPI + Laya
docs/                # kiến trúc, data model, diagram, vận hành, test
public/uploads/       # ảnh local khi dev (được gitignore)
tests/               # Vitest cho business rule
~~~

## Chạy local

~~~powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d
npm ci
npm run db:migrate
npm run db:seed
npm run dev
~~~

Mở http://localhost:3000.

Local demo không cần Google OAuth hoặc SMTP. Nút **Đăng nhập** cho phép chọn Guest, Sinh viên đã xác thực hoặc Admin. Tài khoản Guest có thể xác thực bằng email thuộc một trong các domain demo (`hcmut.edu.vn`, `hcmus.edu.vn`, `uit.edu.vn`) và OTP `123456`; OTP hết hạn sau 5 phút, tối đa 5 lần nhập sai. Các endpoint demo bị tắt khi `NODE_ENV=production`.

Các bài viết và bình luận được kiểm duyệt giả lập sau 4,5 giây. Nội dung có `test_vi_pham` bị từ chối để kiểm tra form giữ lại dữ liệu.

## AI service

Luồng demo Next.js không gọi AI service; moderation được giả lập trong ứng dụng. Compose vẫn có thể chạy AI service cùng PostgreSQL. Chỉ chạy thủ công dưới đây nếu thay AI container bằng tiến trình local:

~~~powershell
Set-Location ai-service
uv sync
uv run uvicorn app.main:app --reload --port 8100
~~~

Next.js chạy trên máy host; Compose chỉ chạy PostgreSQL và AI. Hiện `/v1/moderate` trả 503 vì chưa load Laya; `/health` dùng để kiểm tra AI service.

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

## Luồng demo local

- Đăng nhập và đăng xuất bằng session cookie lưu hash token trong PostgreSQL.
- Xác thực email trường với OTP demo.
- Tạo/sửa/xóa bài và bình luận; vote, báo cáo, trang Admin.
- Ảnh JPEG/PNG/WebP được lưu trong `public/uploads/`.
- Dữ liệu demo có thể seed lại bằng `npm run db:seed` mà không tạo trùng bài, bình luận hoặc tài khoản.
