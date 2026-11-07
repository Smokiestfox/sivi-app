# Test plan SiVi

**Chiến lược:** test business rule bằng Vitest và AI service/client bằng pytest.

## 1. Mục tiêu

- Ưu tiên bảo vệ P0 trước, sau đó P1/P2.
- Không cho AI lỗi làm nội dung được đăng.
- Không cho user sửa/xóa nội dung người khác.
- Không để report trùng hoặc xử lý thiếu báo cáo.

## 2. Test pyramid

| Tầng | Công cụ | Phạm vi |
|---|---|---|
| Business rule | Vitest | validation, quyền, policy, helper |
| AI | pytest | FastAPI, AI client, fail-closed |
| Database | Vitest + PostgreSQL test (khi cần) | Chỉ test các rule cần DB |

Không dùng Playwright hoặc kiểm thử contract riêng cho MVP.

## 3. Ưu tiên kiểm thử theo use case

| UC | Test chính |
|---|---|
| UC01 | Google OAuth callback; session cookie |
| UC02 | OTP đúng/sai/hết hạn/khóa 5 lần; email trùng; domain sai; resend |
| UC03–UC06 | Tạo bài roommate/review, feed chỉ ACTIVE, chi tiết HIDDEN chỉ owner/Admin |
| UC09 | AI pass/reject/timeout; không lưu khi fail; moderation log append-only |
| UC07 | Comment hợp lệ/rỗng/reject; chỉ owner sửa/xóa |
| UC08, UC10–UC11 | Báo cáo trùng; Admin keep/remove và xử lý cùng target |
| UC12–UC14 | Owner sửa/xóa; non-owner bị từ chối; vote chỉ cho review |

Triển khai test theo P0 trước, P1 tiếp theo, P2 cuối cùng. UC07 là P1 bắt buộc theo yêu cầu môn học.

## 4. Test matrix theo business rule

| BR | Test |
|---|---|
| BR1 | Guest không post/comment/report; student được |
| BR2 | Domain trường hợp lệ; domain ngoài danh sách bị chặn |
| BR3 | OTP 6 số, 5 phút, 5 lần, resend vô hiệu OTP cũ |
| BR4 | Mọi text hiển thị đều qua AI; tags/address/contact cũng quét |
| BR5 | Admin chỉ xử lý report; không auto remove |
| BR6 | Một email trường chỉ gắn một user |
| BR7 | Vote bài roommate bị 400 |
| BR8 | AI reject không tạo nội dung; điểm trung gian/ragebait chỉ bật needs_review |
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
  - Comment, vote, report.

## 6. Test bảo mật

- CSRF/Origin thiếu hoặc sai.
- Session hết hạn, logout, cookie sai.
- User A sửa/xóa bài/comment của B.
- User thường gọi API admin.
- Upload file không phải ảnh, quá size.
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
  npm test
  npm run build

ai:
  pip install -e ".[dev]"
  ruff check app
  pytest
~~~

Không cần service PostgreSQL trong CI cho unit test. Chỉ thêm service DB nếu có test tích hợp thực sự cần DB.

## 9. Definition of done

- Tất cả test pass trên CI.
- Không merge nếu thiếu test cho BR mới.
- Bug fix phải có regression test.
- CI chạy lint, typecheck, test và build.
