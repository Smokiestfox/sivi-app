# Test plan SiVi

**Trạng thái:** chưa chốt chiến lược; skeleton chưa có test.

## 1. Mục tiêu

- Bảo vệ 14 use case và 11 business rule.
- Không cho AI lỗi làm bài được đăng.
- Không cho user sửa/xóa nội dung người khác.
- Không để report trùng hoặc xử lý thiếu báo cáo.
- Upload ảnh an toàn.

## 2. Test pyramid

| Tầng | Công cụ | Phạm vi |
|---|---|---|
| Unit | Vitest | validation, policy, helper |
| Integration | Vitest + PostgreSQL test | route handler + service + DB |
| E2E | Playwright | luồng người dùng |
| AI | pytest | FastAPI, policy adapter, timeout |
| Contract | Vitest + Zod | request/response schema |

## 3. Test matrix theo use case

| UC | Test chính |
|---|---|
| UC01 | Google OAuth state/nonce; callback tạo user; session cookie |
| UC02 | OTP đúng/sai/hết hạn/khóa 5 lần; email trùng; domain sai; resend |
| UC03 | Tạo bài roommate; thiếu field; AI reject; AI timeout; ảnh |
| UC04 | Feed chỉ active; filter district/price; phân trang |
| UC05 | Tạo review; rating 1–5; place_type; AI reject |
| UC06 | Chi tiết review; hidden chỉ owner/admin |
| UC07 | Comment; rỗng; AI reject; comment_count đúng |
| UC08 | Report post/comment; trùng; target hidden |
| UC09 | AI pass/reject/timeout; không lưu khi fail; log |
| UC10 | Admin keep/remove; xử lý tất cả report cùng target |
| UC11 | Remove ẩn nội dung; notification; rollback |
| UC12 | Owner sửa/xóa; non-owner 403; AI kiểm duyệt lại |
| UC13 | Vote up/down/toggle; chỉ review; counts đúng |
| UC14 | Owner sửa/xóa comment; non-owner 403; AI kiểm duyệt lại |

## 4. Test matrix theo business rule

| BR | Test |
|---|---|
| BR1 | Guest không post/comment/report; student được |
| BR2 | Domain trường hợp lệ; domain ngoài danh sách bị chặn |
| BR3 | OTP 6 số, 5 phút, 5 lần, resend vô hiệu OTP cũ |
| BR4 | Mọi text hiển thị đều qua AI; tag/address/contact cũng quét |
| BR5 | Admin chỉ xử lý report; không auto remove |
| BR6 | Một email trường chỉ gắn một user |
| BR7 | Vote bài roommate bị 400 |
| BR8 | AI reject không tạo row |
| BR9 | Nhiều report cùng target; admin thấy count |
| BR10 | Non-owner không sửa/xóa bài; sửa phải qua AI |
| BR11 | Non-owner không sửa/xóa comment; sửa phải qua AI |

## 5. Test DB

- Dùng PostgreSQL riêng, không dùng DB dev.
- Mỗi test chạy trong transaction rollback, hoặc truncate trước mỗi suite.
- Seed tối thiểu:
  - 2 trường, 3 domain.
  - 1 admin, 2 student, 1 guest.
  - 2 bài roommate, 2 bài review.
  - Comment, vote, report, notification.

## 6. Test bảo mật

- CSRF/Origin thiếu hoặc sai.
- Session hết hạn, logout, cookie sai.
- User A sửa/xóa bài/comment của B.
- User thường gọi API admin.
- Upload file sai MIME, quá size, magic bytes giả.
- SQL injection qua filter/search.
- XSS qua title/content/tag.
- Rate limit OTP/post/comment/report.
- OTP brute force 5 lần.
- Report trùng.
- AI timeout không làm treo request quá 10 giây.

## 7. Test AI

- Payload đủ text: title, content, place, tags, amenities, contact.
- AI pass → 201.
- AI reject → 422.
- AI 500/timeout → 503.
- Response sai schema → 503.
- Không lưu bài khi AI fail.
- Log có policy_version, model_version.

## 8. CI

~~~text
web:
  npm ci
  npm run lint
  npm run typecheck
  npm run test
  npm run build

ai:
  pip install -e ".[dev]"
  ruff check app
  pytest
~~~

Integration test cần service PostgreSQL; dùng GitHub Actions service container.

## 9. Definition of done

- Tất cả test pass trên CI.
- Không merge nếu thiếu test cho BR mới.
- Bug fix phải có regression test.
- E2E chạy được trên build production.

## 10. Vấn đề mở

1. Chốt Vitest + Testing Library hay chỉ Vitest cho MVP.
2. Chốt Playwright chạy local hay trong Docker.
3. Có cần test tải AI bằng Locust/k6 không.
4. Chốt ngưỡng coverage tối thiểu 70% cho service.
