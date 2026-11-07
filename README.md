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
storage/             # ảnh local khi dev
tests/               # Vitest cho business rule
~~~

## Chạy local

~~~powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d
npm ci
npm run db:migrate
npm run dev
~~~

Mở http://localhost:3000.

## AI service

Thông thường Compose chạy AI cùng PostgreSQL. Chỉ chạy thủ công dưới đây nếu thay AI container bằng tiến trình local:

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
- AI model Laya.
- Tính năng nghiệp vụ theo lộ trình P0 → P1 → P2.
