# ADR-0001: Next.js full-stack + PostgreSQL + Python AI

**Trạng thái:** chưa chốt
**Ngày:** 07/11/2026

## Bối cảnh

- Giảng viên cho backend tự do; Django chỉ là gợi ý.
- UI hiện có là Next.js/React và cần tận dụng.
- Không cần realtime.
- Cần upload ảnh thật.
- AI dùng thư viện Python.

## Quyết định

Giữ Next.js full-stack cho web/API, PostgreSQL cho dữ liệu, Python FastAPI cho AI service.

## Hệ quả

- Một runtime web, một runtime AI.
- Không cần Django, Redis, Celery ở MVP.
- AI kiểm duyệt đồng bộ; lỗi/timeout thì fail closed.
- UI được port dần từ branch an.
