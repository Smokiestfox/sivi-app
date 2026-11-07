# ADR-0001: Next.js full-stack + PostgreSQL + Python AI

**Trạng thái:** chấp nhận cho MVP
**Ngày:** 07/11/2026

## Bối cảnh

- Không cần realtime.
- Cần upload ảnh thật nhưng đồ án có thể chạy local, dự định deploy, có domain

## Quyết định

Giữ Next.js full-stack, PostgreSQL và Python FastAPI. Demo chạy PostgreSQL + AI bằng Docker Compose; Next.js chạy trực tiếp trên máy host. Server Components đọc dữ liệu qua service có Drizzle; route handlers chỉ phục vụ ghi, OAuth callback, upload và health check. Dùng `openid-client` cho Google OAuth; OTP và session vẫn do ứng dụng tự quản lý. Ảnh lưu trong `storage/`.

## Hệ quả

- Một runtime web, một runtime AI.
- Không cần Django, Redis, Celery, S3/MinIO hoặc VPS cho MVP.
- AI kiểm duyệt đồng bộ; lỗi/timeout thì fail closed.
- UI được port dần từ branch an.
- Không thêm REST API đọc, repository riêng, client query cache hay E2E framework.
