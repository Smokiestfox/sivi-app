# API contract SiVi

**Trạng thái:** đã chốt  
**Base path:** /api/v1  
**Auth:** session cookie HttpOnly  
**Content type:** application/json, trừ tạo/sửa bài dùng multipart/form-data.

## 1. Quy ước chung

### 1.1. Auth

- Trình duyệt gửi cookie sivi_session.
- Mutation bắt buộc có header Origin khớp APP_URL.
- API trả 401 nếu chưa đăng nhập.
- API trả 403 nếu sai quyền hoặc thiếu xác thực sinh viên.

### 1.2. Lỗi

~~~json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ.",
    "fields": {
      "title": "Tiêu đề không được để trống."
    }
  }
}
~~~

Mã lỗi:

| HTTP | Code | Nghĩa |
|---:|---|---|
| 400 | VALIDATION_ERROR | Dữ liệu sai |
| 401 | UNAUTHENTICATED | Chưa đăng nhập |
| 403 | FORBIDDEN | Không có quyền |
| 404 | NOT_FOUND | Không tìm thấy |
| 409 | CONFLICT | Trùng dữ liệu hoặc trạng thái đã đổi |
| 422 | MODERATION_REJECTED | AI từ chối nội dung |
| 429 | RATE_LIMITED | Quá nhiều request |
| 503 | SERVICE_UNAVAILABLE | DB/AI/email lỗi |

### 1.3. Phân trang

Query: limit, cursor.

~~~json
{
  "items": [],
  "nextCursor": "opaque-string"
}
~~~

limit mặc định 20, tối đa 50. Không dùng offset cho feed.

### 1.4. Thời gian

Tất cả timestamp là ISO 8601 UTC.

## 2. DTO

### 2.1. User

~~~json
{
  "id": 1,
  "email": "user@example.com",
  "name": "Nguyễn Văn A",
  "avatarUrl": null,
  "role": "student",
  "isVerified": true,
  "universityId": 1,
  "universityEmail": "a@gm.uit.edu.vn"
}
~~~

### 2.2. Post

~~~json
{
  "id": 10,
  "type": "roommate",
  "status": "active",
  "title": "Phòng gần trường",
  "content": "Mô tả...",
  "address": "Thủ Đức",
  "googleMapsUrl": null,
  "images": [
    {
      "id": 1,
      "url": "/media/posts/abc.webp",
      "width": 1200,
      "height": 800,
      "altText": null
    }
  ],
  "tags": ["Gần trường"],
  "author": {
    "id": 1,
    "name": "Nguyễn Văn A",
    "avatarUrl": null
  },
  "counts": {
    "comments": 2,
    "upvotes": 0,
    "downvotes": 0
  },
  "currentUserVote": null,
  "createdAt": "2026-11-07T00:00:00.000Z",
  "updatedAt": "2026-11-07T00:00:00.000Z"
}
~~~

Field riêng cho roommate:

~~~json
{
  "rent": 3000000,
  "peopleNeeded": 1,
  "genderPreference": "any",
  "areaM2": 25,
  "roommateRequirements": "Sạch sẽ",
  "roomType": "shared",
  "district": "Thủ Đức",
  "amenities": ["Wifi"],
  "contactInfo": "Email: a@example.com"
}
~~~

Field riêng cho review:

~~~json
{
  "placeName": "Cafe A",
  "placeType": "cafe",
  "referencePrice": 50000,
  "rating": 4,
  "experience": "Yên tĩnh",
  "priceRange": "medium",
  "wifiRating": 4,
  "atmosphereRating": 5,
  "serviceRating": 4
}
~~~

### 2.3. Comment

~~~json
{
  "id": 5,
  "postId": 10,
  "content": "Còn phòng không?",
  "author": {
    "id": 2,
    "name": "Trần Thị B",
    "avatarUrl": null
  },
  "createdAt": "2026-11-07T00:00:00.000Z",
  "updatedAt": "2026-11-07T00:00:00.000Z"
}
~~~

## 3. Auth

| Method | Path | Body | Kết quả |
|---|---|---|---|
| GET | /auth/google/start | — | 302 sang Google |
| GET | /auth/google/callback | — | 302 về app, set cookie |
| POST | /auth/otp/request | email | 200, gửi OTP |
| POST | /auth/otp/verify | email, otp | 200, nâng role student |
| GET | /auth/me | — | 200 user hoặc null |
| POST | /auth/logout | — | 200, xóa session |

OTP:

- 6 số, hạn 5 phút, tối đa 5 lần.
- Gửi lại phải vô hiệu OTP cũ.
- Rate limit 60 giây/user và 60 giây/email.
- Email trường phải thuộc university_domains.

## 4. Posts

### 4.1. Danh sách

GET /posts?type=roommate|review&q=&district=&maxPrice=&cursor=&limit=

- Chỉ trả status active.
- q tìm trong title, content, địa điểm.
- district và maxPrice chỉ áp dụng roommate.
- Sắp xếp created_at giảm dần.

### 4.2. Tạo bài

POST /posts, content-type multipart/form-data.

Parts:

- payload: JSON string.
- images: 0–5 file JPEG/PNG/WebP, tối đa 5 MB/file.

Payload roommate:

~~~json
{
  "type": "roommate",
  "title": "Phòng gần trường",
  "content": "Mô tả...",
  "address": "Thủ Đức",
  "googleMapsUrl": null,
  "tags": ["Gần trường"],
  "rent": 3000000,
  "peopleNeeded": 1,
  "genderPreference": "any",
  "areaM2": 25,
  "roommateRequirements": "Sạch sẽ",
  "roomType": "shared",
  "district": "Thủ Đức",
  "amenities": ["Wifi"],
  "contactInfo": "Email: a@example.com"
}
~~~

Payload review:

~~~json
{
  "type": "review",
  "title": "Cafe A",
  "content": "Mô tả...",
  "address": "Thủ Đức",
  "googleMapsUrl": null,
  "tags": ["Yên tĩnh"],
  "placeName": "Cafe A",
  "placeType": "cafe",
  "referencePrice": 50000,
  "rating": 4,
  "experience": "Yên tĩnh",
  "priceRange": "medium",
  "wifiRating": 4,
  "atmosphereRating": 5,
  "serviceRating": 4
}
~~~

Server:

1. Auth + requireStudent.
2. Parse multipart, Zod validate payload.
3. Kiểm tra ảnh bằng magic bytes.
4. Gọi AI moderation với toàn bộ text.
5. Nếu AI fail: trả 422, xóa file tạm.
6. Nếu AI lỗi/timeout: trả 503, xóa file tạm.
7. Nếu pass: transaction insert post + subtype + images + tags + moderation log.
8. Trả 201 Post DTO.

### 4.3. Chi tiết

GET /posts/{id}

- Active: công khai.
- Hidden: chỉ chủ bài hoặc admin.
- Không tồn tại: 404.

### 4.4. Sửa bài

PATCH /posts/{id}, multipart/form-data.

- Chỉ chủ bài.
- payload JSON đầy đủ như tạo bài.
- images: ảnh mới.
- keepImageIds: JSON array id ảnh giữ lại.
- AI kiểm duyệt lại toàn bộ text.
- Ảnh bị bỏ: xóa row và file.
- Không đổi post_type.

### 4.5. Xóa bài

DELETE /posts/{id}

- Chỉ chủ bài.
- Xóa cascade comment, vote, image, report; ghi audit nếu cần.
- Trả 200.

## 5. Comments

| Method | Path | Body |
|---|---|---|
| GET | /posts/{id}/comments?cursor=&limit= | — |
| POST | /posts/{id}/comments | content |
| PATCH | /comments/{id} | content |
| DELETE | /comments/{id} | — |

Quy tắc:

- Chỉ student đã xác thực.
- Nội dung 1–2000 ký tự.
- AI kiểm duyệt trước khi lưu.
- Chỉ chủ comment sửa/xóa.
- Comment hidden không trả trong danh sách công khai.
- Số comment trong Post DTO đếm comment active.

## 6. Vote

POST /posts/{id}/vote

~~~json
{ "value": 1 }
~~~

- Chỉ bài review.
- value = 1 hoặc -1.
- Cùng hướng: bỏ vote.
- Khác hướng: đổi vote.
- Trả counts mới + currentUserVote.

## 7. Report

POST /reports

~~~json
{
  "postId": 10,
  "reason": "spam",
  "description": "Nội dung quảng cáo"
}
~~~

Hoặc:

~~~json
{
  "commentId": 5,
  "reason": "abuse",
  "description": ""
}
~~~

Quy tắc:

- Đúng một trong postId/commentId.
- Mỗi user chỉ báo cáo một lần cho mỗi target.
- reason: spam, abuse, misinformation, other.
- description tối đa 1000 ký tự.
- Target phải đang active.

## 8. Admin

GET /admin/reports?status=pending|resolved_keep|resolved_remove

- Chỉ admin.
- pending mặc định.
- Trả kèm target, reporter, AI result, số báo cáo cùng target.

POST /admin/reports/{id}/resolve

~~~json
{
  "decision": "remove",
  "note": "Nội dung vi phạm"
}
~~~

- decision: keep hoặc remove.
- remove bắt buộc note.
- Transaction:
  1. Lock report.
  2. Lock target.
  3. Nếu remove: set post/comment hidden.
  4. Cập nhật tất cả report pending cùng target.
  5. Tạo notification cho chủ nội dung.
- Không xử lý riêng lẻ từng report.

## 9. Profile và notification

| Method | Path | Kết quả |
|---|---|---|
| GET | /me | User |
| GET | /me/posts | Bài của tôi, gồm hidden |
| GET | /me/comments | Comment của tôi |
| GET | /notifications | 50 thông báo mới nhất |
| PATCH | /notifications/{id}/read | Đánh dấu đã đọc |

## 10. Giới hạn validate

| Trường | Giới hạn |
|---|---|
| title | 1–120 ký tự |
| content | 1–5000 ký tự |
| comment | 1–2000 ký tự |
| report description | 0–1000 ký tự |
| tags | tối đa 12, mỗi tag 40 ký tự |
| amenities | tối đa 20, mỗi mục 80 ký tự |
| images | tối đa 5, mỗi ảnh 5 MB, tổng 25 MB |
| rent/referencePrice | >= 0, tối đa 2 tỷ |
| peopleNeeded | 1–20 |
| rating | 1–5 |
| OTP | 6 số |
| page limit | 1–50 |

## 11. Bảo mật

- Cookie HttpOnly, Secure khi HTTPS, SameSite=Lax.
- Mutation kiểm tra Origin.
- CSRF token cho form nếu dùng cookie session.
- Rate limit:
  - OTP: 60 giây/user, 60 giây/email.
  - Post/comment: 10 request/5 phút/user.
  - Report: 20 request/giờ/user.
  - AI: theo user + IP.
- Không trả stack trace.
- Không tin content-type từ client.
- Kiểm tra quyền ở server, không chỉ ẩn nút.

## 12. Vấn đề mở

1. Có cần API xóa ảnh riêng không, hay chỉ xóa qua PATCH bài?
2. Có cần optimistic concurrency cho PATCH bài không?
3. Có cần trả ETag cho feed không?
