# Kiến trúc & Tech stack SiVi

**Trạng thái:** quyết định cho MVP
**Ngày:** 07/11/2026
**Phạm vi:** kiến trúc web app SiVi, dùng cho skeleton và các PR tiếp theo.
**Bộ diagram:** xem **diagrams.md**.

Yêu cầu nghiệp vụ và màn hình gốc: [THIET-KE-SIVI.md](THIET-KE-SIVI.md). Tài liệu này chốt các quyết định MVP khi đặc tả gốc còn nhiều lựa chọn hoặc mâu thuẫn.

## 1. Stack

SiVi dùng **Next.js full-stack + PostgreSQL + Python AI service**.

- Frontend và API cùng một Next.js app.
- PostgreSQL là database duy nhất.
- AI là service Python riêng, gọi qua HTTP.
- Ảnh upload thật, lưu local trong `storage/`.
- Không realtime; Server Components đọc dữ liệu, `router.refresh()` sau khi ghi.

## 2. Kiến trúc

```text
Browser
  │
  ▼
Next.js 16 (React 19)
  ├── app/ pages
  ├── components/ UI
  └── app/api/ route handlers (mỏng)
          │
          ├── server/ services (nghiệp vụ + truy vấn Drizzle)
          ├── PostgreSQL 17 (Drizzle ORM)
          ├── storage/ (ảnh local)
          └── Python FastAPI AI service (Laya)
```

Next.js xử lý web, auth, CRUD, upload và admin. Python chỉ chạy model AI.

## 3. Căn cứ quyết định

- Giảng viên cho backend tự do; Django không bắt buộc.
- UI hiện có là Next.js/React, tận dụng gần như toàn bộ.
- Một runtime web giảm công deploy, CORS, session và đồng bộ type.
- AI dùng Python vì Laya và các thư viện model nằm trong hệ sinh thái Python.
- Không realtime nên không cần WebSocket, Redis hay job queue.

## 4. Tech stack

| Lớp           | Công nghệ                                                    | Ghi chú                                                                |
| -------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Frontend       | Next.js 16, React 19, TypeScript                               | UI hiện tại                                                           |
| UI             | Tailwind CSS + Ant Design                                      | AntD cho admin/form phức tạp                                          |
| Data fetching  | Server Components + `router.refresh()`                       | Không thêm client cache cho MVP                                       |
| Backend        | Next.js Route Handlers                                         | Chỉ ghi, OAuth callback, upload và health                             |
| Business logic | `server/<module>/service.ts`                                 | Gọi Drizzle trực tiếp; route không viết query                      |
| ORM            | Drizzle ORM + drizzle-kit                                      | Schema TypeScript, migration rõ                                        |
| Database       | PostgreSQL 17                                                  | 14 bảng cốt lõi                                                      |
| Validation     | Zod                                                            | Dùng chung client/server                                               |
| Auth           | `openid-client` cho Google OIDC; OTP + session tự quản lý | Dùng helper của thư viện cho state, nonce, PKCE và kiểm tra token |
| AI             | Python 3.12 + FastAPI + Laya                                   | Gọi đồng bộ, timeout 10 giây                                       |
| Upload         | `storage/` + sharp                                           | Xác thực ảnh, resize và bỏ EXIF                                    |
| Test           | Vitest + pytest                                                | Business rule và AI client; không E2E                                 |
| CI             | GitHub Actions                                                 | lint, typecheck, test, build                                            |
| Deploy demo    | Docker Compose + Next.js trên host                            | Compose chỉ chạy PostgreSQL và AI                                    |

Đọc dữ liệu trực tiếp trong Server Components; không dựng REST API để đọc. Vận hành: **operations.md**. Test: **testing.md**.

## 5. Cấu trúc repo

```text
sivi-app/
├─ app/
│  ├─ page.tsx
│  ├─ review/page.tsx
│  ├─ posts/[id]/page.tsx
│  └─ api/                  # ghi, OAuth callback, upload, health
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
├─ lib/                     # client utils
├─ types/
├─ tests/
├─ storage/                 # ảnh local, gitignore
└─ scripts/
```

Không tạo frontend/ và backend/ riêng. Tách lớp trong cùng app.

## 6. Nguyên tắc backend

- Server Components đọc dữ liệu qua `server/<module>/service.ts`.
- Mỗi module chỉ có `service.ts`; service chứa nghiệp vụ và gọi Drizzle trực tiếp.
- Route handler chỉ xử lý thao tác ghi, OAuth callback, upload và health check.
- Không viết query Drizzle trong route handler.
- Mọi mutation quan trọng dùng transaction.
- Upload ảnh là service riêng, không nhét base64 vào JSON bài viết.

Luồng tạo bài:

1. Route handler nhận dữ liệu ghi.
2. Zod validate và kiểm tra quyền.
3. Gọi AI đồng bộ; lỗi thì fail closed.
4. Service lưu bài + ảnh + moderation log bằng Drizzle transaction.
5. Giao diện gọi `router.refresh()` để đọc dữ liệu mới.

## 7. Database

Data model đã chốt trong data-model.md.

- 14 bảng cốt lõi và bảng `sessions`.
- Không có moderation_jobs ở MVP.
- post_images lưu storage_key, mime_type, size_bytes, width, height.
- moderation_logs là append-only.
- Tags AI và cờ `needs_review` lưu trong moderation_logs.
- votes chỉ áp dụng cho bài review.

Trạng thái bài:

```text
ACTIVE
HIDDEN
```

AI chạy đồng bộ nên không dùng DRAFT/PROCESSING/PENDING_REVIEW ở MVP.

## 8. Auth

- Dùng [openid-client](https://github.com/panva/openid-client) cho Google OpenID Connect Authorization Code Flow; dùng helper của thư viện để tạo/kiểm tra state, nonce, PKCE và token, không tự viết xác thực chữ ký/JWKS.
- OTP 6 số, hash Argon2/scrypt, hạn 5 phút, tối đa 5 lần.
- verification_requests lưu lịch sử; không dùng email làm PK.
- Session cookie HttpOnly, Secure, SameSite=Lax.
- CSRF/Origin check cho mutation.
- Phân quyền guest/student/admin ở server.
- Session và OTP vẫn do ứng dụng tự quản lý.

## 9. AI moderation

Kiểm duyệt đồng bộ:

1. Sinh viên gửi bài/bình luận.
2. Server validate.
3. Gọi Python service POST /v1/moderate với toàn bộ text hiển thị.
4. AI trả tags + scores.
5. Policy engine chỉ quyết định pass/reject; bạo lực/nội dung tình dục vượt ngưỡng thì reject.
6. Pass: lưu bài ACTIVE + moderation_log. Điểm trung gian/ragebait chỉ bật `needs_review` trong log để Admin xem.
7. Reject: không lưu bài; AI lỗi/timeout: fail closed, không lưu bài.

Text gửi AI gồm:

- title
- content
- place name/address
- tags
- amenities
- contact info

Không chỉ gửi title + content.

## 10. Upload ảnh

Ảnh gửi cùng request tạo/sửa bài, không có endpoint upload rời.

1. Client gửi FormData gồm payload và ảnh tới route handler tạo/sửa bài.
2. Server đọc formData, validate payload và giới hạn size; `sharp` xác thực ảnh thật.
3. `sharp` resize/strip EXIF rồi ghi vào storage.
4. Transaction: insert/update post, post_images, moderation_log.
5. Nếu transaction lỗi, xóa file vừa ghi.
6. Khi sửa, client gửi keepImageIds; ảnh bỏ thì xóa row và file.

Giới hạn tạm thời:

- Tối đa 5 ảnh/bài.
- Tối đa 5 MB/ảnh.
- Chỉ JPEG, PNG, WebP.
- Dùng `sharp` để xác thực và xử lý ảnh, không tin content-type từ client.
- Dùng `storage/` local cho demo đồ án.
- Ảnh public nhưng URL khó đoán; không chứa thông tin nhạy cảm.

## 11. Không realtime

- Không WebSocket, không SSE.
- Không dùng TanStack Query.
- Đọc bằng Server Components; sau khi ghi dùng `router.refresh()`.
- Người dùng khác tải lại trang để thấy dữ liệu mới.

## 12. Lộ trình

1. P0: UC01, UC02, UC03–UC06, UC09 — đăng nhập/xác thực, đăng bài, feed/chi tiết và AI.
2. P1: UC07 bình luận, UC08 báo cáo, UC10–UC11 Admin xử lý.
3. P2: UC12, UC14 sửa/xóa và UC13 vote; cắt P2 nếu hết thời gian.

## 13. Phân công

| Thành viên       | Module                                                    |
| ------------------ | --------------------------------------------------------- |
| Trịnh Quốc An    | UI layout, home, forum, form, responsive                  |
| Phan Thanh Bình   | interaction UI, profile, admin UI + reports/admin service |
| Ngô Quý Chính   | posts/comments/votes service, Drizzle query, transaction  |
| Nguyễn Minh Đạt | auth, OTP, session, schema/migration, upload/storage      |
| Nguyễn Vũ Bách  | AI service Python, Laya, policy, timeout, QA/test         |

## 14. Điều kiện hoàn thành

- Hoàn tất P0 trước; P1 cần có UC07 bình luận theo yêu cầu môn học.
- 11 business rule có test.
- AI quét đủ text, fail closed.
- Upload ảnh thật hoạt động.
- Admin xử lý cả cụm báo cáo.
- Auth state không lệch.
- Không còn SQL trong route handler.
- CI lint + typecheck + test + build.
- Docker Compose chạy từ clone sạch.

## 15. Vấn đề mở

1. Hiệu năng Laya trên máy demo; nếu chậm, chọn model nhẹ hơn nhưng vẫn fail closed.
2. Phạm vi port UI và seed/demo data cho buổi bảo vệ.
