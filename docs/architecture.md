# Kiến trúc & Tech stack SiVi

**Trạng thái:** chưa chốt  
**Ngày:** 07/11/2026  
**Phạm vi:** kiến trúc web app SiVi, dùng cho skeleton và các PR tiếp theo.  
**Bộ diagram:** xem **diagrams.md**.

## 1. Stack
SiVi dùng **Next.js full-stack + PostgreSQL + Python AI service**.

- Frontend và API cùng một Next.js app.
- PostgreSQL là database duy nhất.
- AI là service Python riêng, gọi qua HTTP.
- Ảnh upload thật, lưu local/S3.
- Không realtime; client refetch hoặc refresh trang.


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

Next.js xử lý web, auth, CRUD, upload và admin. Python chỉ chạy model AI.

## 3. Căn cứ quyết định

- Giảng viên cho backend tự do; Django không bắt buộc.
- UI hiện có là Next.js/React, tận dụng gần như toàn bộ.
- Một runtime web giảm công deploy, CORS, session và đồng bộ type.
- AI dùng Python vì Laya và các thư viện model nằm trong hệ sinh thái Python.
- Không realtime nên không cần WebSocket, Redis hay job queue.

## 4. Tech stack

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | Next.js 16, React 19, TypeScript | UI hiện tại |
| UI | Tailwind CSS + Ant Design | AntD cho admin/form phức tạp |
| Data fetching | TanStack Query | Cache, invalidate sau mutation |
| Backend | Next.js Route Handlers | Controller mỏng |
| Business logic | server/ services | Không viết SQL trong route |
| ORM | Drizzle ORM + drizzle-kit | Schema TypeScript, migration rõ |
| Database | PostgreSQL 17 | 14 bảng cốt lõi |
| Validation | Zod | Dùng chung client/server |
| Auth | Google OAuth + OTP + session cookie | Tự quản lý session |
| AI | Python 3.12 + FastAPI + Laya | Gọi đồng bộ, timeout 10 giây |
| Upload | local storage/S3 + sharp | Ảnh thật, validate MIME/size |
| Test | Vitest, Playwright, pytest | Unit, E2E, AI |
| CI | GitHub Actions | lint, typecheck, test, build |

Hợp đồng API: **api.md**. Vận hành: **operations.md**. Test: **testing.md**.
| Deploy | VPS + Docker Compose | Next.js chạy trên host; PostgreSQL/AI trong compose |

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

Không tạo frontend/ và backend/ riêng. Tách lớp trong cùng app.

## 6. Nguyên tắc backend

- app/api chỉ parse request, kiểm tra quyền, gọi service, trả response.
- server/posts/service.ts chứa nghiệp vụ.
- server/posts/repository.ts chứa query Drizzle.
- Không viết SQL trực tiếp trong route handler.
- Mọi mutation quan trọng dùng transaction.
- Upload ảnh là service riêng, không nhét base64 vào JSON bài viết.

Luồng tạo bài:

1. Route handler đọc JSON.
2. Zod validate.
3. requireStudent.
4. Gọi moderation service.
5. Nếu pass, gọi post service tạo bài + ảnh + moderation log.
6. Trả post DTO.

## 7. Database

Data model đã chốt trong data-model.md.

- 14 bảng cốt lõi.
- post_tags, notifications, sessions là bảng extension.
- Không có moderation_jobs ở MVP.
- post_images lưu storage_key, mime_type, size_bytes, width, height.
- moderation_logs là append-only.
- votes chỉ áp dụng cho bài review.

Trạng thái bài:

~~~text
ACTIVE
HIDDEN
~~~

AI chạy đồng bộ nên không dùng DRAFT/PROCESSING/PENDING_REVIEW ở MVP.

## 8. API

Base path: /api/v1.

| Nhóm | Endpoint |
|---|---|
| Auth | POST /auth/google/start, GET /auth/google/callback, POST /auth/otp/request, POST /auth/otp/verify, GET /auth/me, POST /auth/logout |
| Posts | GET /posts, POST /posts, GET /posts/{id}, PATCH /posts/{id}, DELETE /posts/{id} |
| Comments | GET /posts/{id}/comments, POST /posts/{id}/comments, PATCH /comments/{id}, DELETE /comments/{id} |
| Votes | POST /posts/{id}/vote |
| Reports | POST /reports |
| Profile | GET /me, GET /me/posts, GET /me/comments |
| Admin | GET /admin/reports?status=, POST /admin/reports/{id}/resolve |

Quy ước:

- Phân trang limit + cursor.
- Lỗi thống nhất: error.code, error.message, error.fields.
- Zod schema dùng chung.
- Mutation trả resource hoặc trạng thái mới.

## 9. Auth

- Google OAuth: state + nonce + JWKS.
- OTP 6 số, hash Argon2/scrypt, hạn 5 phút, tối đa 5 lần.
- verification_requests lưu lịch sử; không dùng email làm PK.
- Session cookie HttpOnly, Secure, SameSite=Lax.
- CSRF/Origin check cho mutation.
- Phân quyền guest/student/admin ở server.
- Auth context dùng chung ở frontend; logout reset toàn bộ state.

Dùng custom auth service, không dùng Auth.js ở phiên bản này.

## 10. AI moderation

Kiểm duyệt đồng bộ:

1. Sinh viên gửi bài/bình luận.
2. Server validate.
3. Gọi Python service POST /v1/moderate với toàn bộ text hiển thị.
4. AI trả tags + scores.
5. Policy engine trong Next quyết định pass/fail.
6. Pass: lưu bài + moderation_log.
7. Fail: trả 422, không lưu.
8. AI lỗi/timeout: trả 503, không lưu.

Text gửi AI gồm:

- title
- content
- place name/address
- tags
- amenities
- contact info

Không chỉ gửi title + content.

## 11. Upload ảnh

Ảnh gửi cùng request tạo/sửa bài, không có endpoint upload rời.

1. Client tạo FormData: payload JSON + images.
2. Gửi POST /posts hoặc PATCH /posts/{id}.
3. Server đọc formData, validate payload, kiểm tra magic bytes và size.
4. sharp resize/strip EXIF, ghi storage.
5. Transaction: insert/update post, post_images, moderation_log.
6. Nếu transaction lỗi, xóa file vừa ghi.
7. Khi sửa, client gửi keepImageIds; ảnh bỏ thì xóa row và file.

Giới hạn tạm thời:

- Tối đa 5 ảnh/bài.
- Tối đa 5 MB/ảnh.
- Chỉ JPEG, PNG, WebP.
- Kiểm tra magic bytes, không tin content-type từ client.
- Local dùng storage/, production dùng S3/MinIO.
- Ảnh public nhưng URL khó đoán; không chứa thông tin nhạy cảm.

## 12. Không realtime

- Không WebSocket, không SSE.
- Dùng TanStack Query.
- Sau khi tạo/sửa/xóa: invalidate query.
- Người dùng khác refresh trang sẽ thấy dữ liệu mới.
- Admin refresh danh sách báo cáo.

## 13. Lộ trình

1. Tag branch an là ui-prototype-v1.
2. Tạo nhánh feat/arch-v3 từ an.
3. Thêm Drizzle + schema + migration.
4. Tách server/ services; route handler mỏng.
5. Làm auth/OTP/session.
6. Làm upload ảnh.
7. Làm AI service Python + gọi đồng bộ.
8. Sửa admin xử lý cả cụm báo cáo.
9. Test + CI.
10. Merge khi build/lint/test pass.

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

## 16. Vấn đề mở

1. **Hiệu năng Laya trên CPU:** cần benchmark thực tế trước khi chốt cấu hình VPS; nếu vượt 10 giây, phải giảm model hoặc chuyển async.
2. **Lưu trữ ảnh production:** chốt S3 hay MinIO, thời hạn giữ file và quy trình backup.
3. **Phạm vi port UI:** chốt thứ tự màn hình port từ branch an để không kéo dài thời gian.
4. **Seed/demo data:** chốt bộ dữ liệu demo cho buổi bảo vệ.

