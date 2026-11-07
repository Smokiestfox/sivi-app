# SiVi

Nền tảng forum tìm roommate và review địa điểm cho sinh viên khu Làng Đại học.

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS + Ant Design
- PostgreSQL 17 + Drizzle ORM
- Python FastAPI cho AI moderation
- Upload ảnh local/S3

## Cấu trúc

~~~text
app/                 # page + API route handler
components/          # UI, port dần từ branch an
server/              # business logic, Drizzle, auth, upload
ai-service/          # FastAPI + Laya
docs/                # architecture, data model, diagrams, API, ops, test
storage/             # ảnh local khi dev
tests/               # test sẽ thêm
~~~

## Chạy local

~~~bash
cp .env.example .env
docker compose up -d postgres ai
npm ci
npm run db:migrate
npm run dev
~~~

Mở http://localhost:3000.

## AI service

~~~bash
cd ai-service
uv sync
uv run uvicorn app.main:app --reload --port 8100
~~~

Hiện /v1/moderate trả 503 vì chưa load Laya; /health dùng để kiểm tra service.

## Kiểm tra

~~~bash
npm run lint
npm run typecheck
npm run build
~~~

## Tài liệu

- [Kiến trúc](docs/architecture.md)
- [Data model](docs/data-model.md)
- [Diagram](docs/diagrams.md)
- [API contract](docs/api.md)
- [Vận hành](docs/operations.md)
- [Test plan](docs/testing.md)

## Trạng thái skeleton

Đã có:

- Next.js app tối thiểu + /api/health.
- Drizzle schema 14 bảng cốt lõi + extension.
- FastAPI service skeleton.
- Docker Compose cho Postgres + AI.
- Docs kiến trúc/data model/diagram.

Chưa có:

- UI port từ branch an.
- Auth/OTP/session.
- CRUD posts/comments/votes/reports.
- Upload ảnh.
- AI model Laya.
- Test.
