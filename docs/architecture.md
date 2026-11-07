# Kiến trúc & Tech stack SiVi v3

**Trạng thái:** đề xuất chốt theo ràng buộc mới  
**Ngày:** 07/11/2026  
**Thay đổi so với v2:** không bắt buộc Django; không cần realtime; có upload ảnh thật; ưu tiên tận dụng UI/frontend.  
**Bộ diagram:** xem **diagrams.md**.

## 1. Kết luận

**Giữ Next.js full-stack, không chuyển sang Django.**

- Frontend và API cùng một Next.js app.
- PostgreSQL là database.
- AI là một Python service riêng, gọi qua HTTP.
- Ảnh upload thật, lưu local/S3, không chỉ nhập URL.
- Không làm realtime; dùng fetch/refetch, refresh trang thấy dữ liệu mới.
- Không cần Redis/Celery ở MVP vì AI kiểm duyệt đồng bộ.

## 2. Kiến trúc

~~~text
Browser
  │
  ▼
Next.js 16 (React 19)
  ├── app/ pages
  ├── components/ UI
  └── app/api/ route handlers (mỏng)
          │
          ├── server/ services + repositories
          ├── PostgreSQL 17 (Drizzle ORM)
          ├── storage/ hoặc S3 (ảnh)
          └── Python FastAPI AI service (Laya)
~~~

**Một runtime chính, một AI runtime riêng.**

- Next.js xử lý web, auth, CRUD, upload, admin.
- Python chỉ chạy model AI.
- Không có Django, không có Celery, không có Redis ở giai đoạn đầu.

## 3. Vì sao không chọn Django

| Tiêu chí | Next.js full-stack | Django + React |
|---|---|---|
| Tận dụng UI hiện tại | Gần như toàn bộ | Phải tách frontend/backend |
| Số runtime | 1 web + 1 AI | 1 web + 1 API + 1 AI |
| Auth/session | Đã có code, cần refactor | Viết lại |
| Upload ảnh | Route handler + storage | DRF + storage |
| Thời gian | Ngắn hơn | Dài hơn 2–4 tuần |
| Phù hợp rubric | Được, vì backend tự do | Được, nhưng nặng hơn |

Giảng viên nói backend tự do, Django chỉ là gợi ý. Vì nhóm đã có UI React/Next và cần demo nhanh, **không nên đổi stack**.

## 4. Tech stack chốt

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | Next.js 16, React 19, TypeScript | Giữ UI hiện tại |
| UI | Tailwind CSS + Ant Design | AntD cho admin/form phức tạp |
| Data fetching | TanStack Query | Cache, invalidate sau mutation |
| Backend | Next.js Route Handlers | Chỉ là controller |
| Business logic | server/ services | Không viết SQL trong route |
| ORM | Drizzle ORM + drizzle-kit | Schema TypeScript, migration rõ |
| Database | PostgreSQL 17 | 14 bảng cốt lõi |
| Validation | Zod | Dùng chung client/server |
| Auth | Google OAuth + OTP + session cookie | Giữ hướng hiện tại, tách service |
| AI | Python 3.12 + FastAPI + Laya | Gọi đồng bộ, timeout 10 giây |
| Upload | local storage/S3 + sharp | Ảnh thật, validate MIME/size |
| Test | Vitest, Playwright, pytest | Unit, E2E, AI |
| CI | GitHub Actions | lint, typecheck, test, build |
| Deploy | Docker Compose | web, postgres, ai, minio tùy chọn |

## 5. Cấu trúc repo

~~~text
sivi-app/
├─ app/
│  ├─ page.tsx
│  ├─ review/page.tsx
│  ├─ posts/[id]/page.tsx
│  ├─ profile/page.tsx
│  ├─ admin/page.tsx
│  └─ api/                  # controller mỏng
├─ components/
│  ├─ ui/
│  ├─ forum/
│  ├─ interaction/
│  ├─ admin/
│  └─ profile/
├─ server/
│  ├─ auth/
│  ├─ posts/
│  ├─ comments/
│  ├─ votes/
│  ├─ reports/
│  ├─ admin/
│  ├─ moderation/
│  ├─ uploads/
│  ├─ db/
│  │  ├─ schema.ts
│  │  ├─ client.ts
│  │  └─ migrations/
│  └─ http/
├─ lib/                     # client utils
├─ types/
├─ tests/
├─ storage/                 # ảnh local, gitignore
└─ scripts/
~~~

Không tạo frontend/ và backend/ riêng. Tách lớp trong cùng app là đủ.

## 6. Nguyên tắc backend

- app/api chỉ parse request, kiểm tra quyền, gọi service, trả response.
- server/posts/service.ts chứa nghiệp vụ.
- server/posts/repository.ts chứa query Drizzle.
- Không viết SQL trực tiếp trong route handler.
- Mọi mutation quan trọng dùng transaction.
- Upload ảnh là service riêng, không nhét base64 vào JSON bài viết.

Ví dụ luồng tạo bài:

1. Route handler đọc JSON.
2. Zod validate.
3. requireStudent.
4. Gọi moderation service.
5. Nếu pass, gọi post service tạo bài + ảnh + moderation log.
6. Trả post DTO.

## 7. Database

Giữ 14 thực thể cốt lõi trong data-model.md.

Điều chỉnh cho stack Next:

- Không dùng django_session; dùng bảng sessions tự quản lý hoặc session của thư viện auth.
- Không cần moderation_jobs ở MVP vì AI chạy đồng bộ.
- post_images lưu storage_key, mime_type, size_bytes, width, height.
- post_tags giữ bảng riêng để filter.
- notifications giữ.
- moderation_logs giữ.

Trạng thái bài cho MVP:

~~~text
ACTIVE
HIDDEN
~~~

Không cần DRAFT/PROCESSING/PENDING_REVIEW nếu AI chạy đồng bộ. Nếu sau này chuyển async, thêm các trạng thái đó.

## 8. API

Base path: /api/v1.

| Nhóm | Endpoint |
|---|---|
| Auth | POST /auth/google/start, GET /auth/google/callback, POST /auth/otp/request, POST /auth/otp/verify, GET /auth/me, POST /auth/logout |
| Posts | GET /posts, POST /posts, GET /posts/{id}, PATCH /posts/{id}, DELETE /posts/{id} |
| Comments | GET /posts/{id}/comments, POST /posts/{id}/comments, PATCH /comments/{id}, DELETE /comments/{id} |
| Votes | POST /posts/{id}/vote |
| Reports | POST /reports |
| Uploads | POST /uploads, DELETE /uploads/{id} |
| Profile | GET /me, GET /me/posts, GET /me/comments |
| Admin | GET /admin/reports?status=, POST /admin/reports/{id}/resolve |

Quy ước:

- Phân trang limit + cursor.
- Lỗi thống nhất: error.code, error.message, error.fields.
- Zod schema dùng chung; có thể sinh OpenAPI sau.
- Mutation trả resource hoặc trạng thái mới.

## 9. Auth

Giữ hướng hiện tại nhưng tách khỏi route:

- Google OAuth: state + nonce + JWKS.
- OTP 6 số, hash Argon2/scrypt, hạn 5 phút, tối đa 5 lần.
- verification_requests lưu lịch sử; không dùng email làm PK.
- Session cookie HttpOnly, Secure, SameSite=Lax.
- CSRF/Origin check cho mutation.
- Phân quyền guest/student/admin ở server.
- Auth context dùng chung ở frontend; logout reset toàn bộ state.

Không cần Auth.js ngay. Nếu muốn giảm code auth, có thể thay sau; nhưng OTP trường vẫn phải tự viết.

## 10. AI moderation

MVP dùng kiểm duyệt đồng bộ:

1. Sinh viên gửi bài/bình luận.
2. Server validate.
3. Gọi Python service POST /v1/moderate với toàn bộ text hiển thị.
4. AI trả tags + scores.
5. Policy engine trong Next quyết định pass/fail.
6. Pass: lưu bài + moderation_log.
7. Fail: trả 422, không lưu.
8. AI lỗi/timeout: trả 503, không lưu.

Không cần realtime, không cần job queue.

Text gửi AI gồm:

- title
- content
- place name/address
- tags
- amenities
- contact info

Không chỉ gửi title + content như code cũ.

## 11. Upload ảnh

Luồng:

1. Client chọn ảnh.
2. POST /api/v1/uploads dạng multipart.
3. Server kiểm tra MIME thật, size, số lượng.
4. sharp resize/strip EXIF.
5. Lưu storage/uploads/{uuid}.webp hoặc S3.
6. Trả image id + URL.
7. Khi tạo bài, gửi image id; server ghi post_images.

Giới hạn đề xuất:

- Tối đa 5 ảnh/bài.
- Tối đa 5 MB/ảnh.
- Chỉ JPEG, PNG, WebP.
- Không tin content-type từ client; kiểm tra magic bytes.
- Local dùng storage/, production dùng S3/MinIO.
- Ảnh public nhưng URL khó đoán; không chứa thông tin nhạy cảm.

## 12. Không realtime

- Không WebSocket, không SSE.
- Dùng TanStack Query.
- Sau khi tạo/sửa/xóa: invalidate query.
- Người dùng khác refresh trang sẽ thấy dữ liệu mới.
- Admin refresh danh sách báo cáo.
- Đơn giản, đúng yêu cầu.

## 13. Lộ trình

1. Tag branch an là ui-prototype-v1.
2. Tạo nhánh feat/arch-v3 từ an.
3. Thêm Drizzle + schema 14 bảng + migration.
4. Tách server/ services; route handler mỏng.
5. Làm auth/OTP/session lại theo service.
6. Làm upload ảnh.
7. Làm AI service Python + gọi đồng bộ.
8. Sửa admin xử lý cả cụm báo cáo.
9. Test + CI.
10. Chỉ merge khi build/lint/test pass.

## 14. Phân công

| Thành viên | Module |
|---|---|
| Trịnh Quốc An | UI layout, home, forum, form, responsive |
| Phan Thanh Bình | interaction UI, profile, admin UI + reports/admin service |
| Ngô Quý Chính | posts/comments/votes service, Drizzle query, transaction |
| Nguyễn Minh Đạt | auth, OTP, session, schema/migration, upload/storage |
| Nguyễn Vũ Bách | AI service Python, Laya, policy, timeout, QA/test |

## 15. Điều kiện hoàn thành

- 14 use case chạy.
- 11 business rule có test.
- AI quét đủ text, fail closed.
- Upload ảnh thật hoạt động.
- Admin xử lý cả cụm báo cáo.
- Auth state không lệch.
- Không còn SQL trong route handler.
- CI lint + typecheck + test + build.
- Docker Compose chạy từ clone sạch.

## 16. Điểm cần chốt

1. Drizzle hay Prisma? Đề xuất Drizzle.
2. Custom auth hay Auth.js? Đề xuất custom auth đã tách service.
3. Local storage hay S3? Đề xuất local cho demo, S3 cho deploy.
4. Có cần notifications ngay không? Nên có.
5. Có cần moderation_jobs không? Không ở MVP.

