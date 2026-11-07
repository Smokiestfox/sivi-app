# Data model SiVi v2 — đối chiếu EERD & class diagram

**Trạng thái:** chưa chốt  
**Mục tiêu:** giữ 14 thực thể cốt lõi, bổ sung phần còn thiếu, chốt các điểm lệch giữa class diagram và database.  
**Stack áp dụng:** Next.js full-stack + PostgreSQL; không phụ thuộc Django.

## 1. Kết luận

Data model đã chốt với 14 thực thể cốt lõi và 6 điều chỉnh so với bản cũ:

1. Dùng khóa chính bigint thay cho int.
2. Chuyển OTP từ Người dùng sang Yêu cầu xác thực.
3. Tách Trường và Tên miền trường thành 2 bảng.
4. Giữ Bài đăng là bảng cha; Bài tìm roommate/Bài review là bảng con one-to-one.
5. Thêm Nhật ký kiểm duyệt và Ảnh bài đăng thành bảng riêng.
6. Thêm các bảng extension: post_tags, notifications, sessions.

Mô hình khớp 14 thực thể cốt lõi; các bảng extension được ghi rõ.

## 2. 14 bảng cốt lõi

| STT | Thực thể thiết kế | Bảng v2 | Ghi chú |
|---:|---|---|---|
| 1 | Trường | universities | Mã trường, tên, tên viết tắt |
| 2 | Tên miền trường | university_domains | Nhiều domain/trường |
| 3 | Người dùng | users | Bỏ OTP fields |
| 4 | Yêu cầu xác thực | verification_requests | Thêm OTP hash, hạn, attempts |
| 5 | Quản trị viên | admin_profiles | Kế thừa users |
| 6 | Sinh viên | student_profiles | Kế thừa users |
| 7 | Bài đăng | posts | Bảng cha |
| 8 | Bài tìm roommate | roommate_posts | One-to-one với posts |
| 9 | Bài review | review_posts | One-to-one với posts |
| 10 | Ảnh bài đăng | post_images | Nhiều ảnh/bài |
| 11 | Bình luận | comments | FK post, user |
| 12 | Bình chọn | votes | Chỉ review |
| 13 | Báo cáo | reports | Đa hình post/comment |
| 14 | Nhật ký kiểm duyệt | moderation_logs | Append-only |

**Bảng extension:**

- post_tags: tag chuẩn hóa để filter.
- notifications: thông báo trong app.
- sessions: session do backend quản lý, không phải bảng nghiệp vụ.

## 3. Cột và ràng buộc chính

### universities

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| name | varchar(200) | NOT NULL |
| short_name | varchar(50) | NOT NULL |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

### university_domains

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| university_id | bigint | FK universities |
| domain | varchar(255) | UNIQUE, lowercase |
| domain_type | enum | student, staff, alumni, other |
| created_at | timestamptz | NOT NULL |

UNIQUE (university_id, domain).

### users

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| google_id | varchar(255) | UNIQUE, NOT NULL |
| email | varchar(254) | UNIQUE, NOT NULL |
| university_email | varchar(254) | UNIQUE, NULL |
| name | varchar(200) | NOT NULL |
| avatar_url | text | NULL |
| role | enum | guest, student, admin |
| is_verified | boolean | NOT NULL default false |
| university_id | bigint | FK universities, NULL |
| student_id | varchar(50) | NULL |
| contact | varchar(255) | NULL |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

CHECK: is_verified = true thì university_id và university_email NOT NULL; false thì cả hai NULL.

Giữ student_id và contact ở users để khớp class diagram; major/cohort đưa vào student_profiles.

### student_profiles

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| user_id | bigint | PK, FK users |
| major | varchar(200) | NULL |
| cohort | varchar(50) | NULL |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

### admin_profiles

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| user_id | bigint | PK, FK users |
| admin_level | enum | moderator, super_admin |
| appointed_at | date | NULL |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

### verification_requests

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| user_id | bigint | FK users |
| email | varchar(254) | NOT NULL |
| university_id | bigint | FK universities |
| otp_hash | text | NOT NULL |
| otp_expires_at | timestamptz | NOT NULL |
| attempts | smallint | 0..5 |
| status | enum | pending, verified, expired, locked, failed |
| sent_at | timestamptz | NOT NULL |
| verified_at | timestamptz | NULL |
| created_at | timestamptz | NOT NULL |

Index: (user_id, status), (email, status), (otp_expires_at).  
Partial unique: một pending/user, một pending/email.

Đây là chỗ giải quyết mâu thuẫn: class diagram đặt OTP trong Người dùng, ánh xạ DB đặt trong Yêu cầu xác thực. Chọn Yêu cầu xác thực và cập nhật class diagram.

### posts

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| author_id | bigint | FK users |
| post_type | enum | roommate, review |
| title | varchar(120) | NOT NULL |
| content | text | 1..5000 |
| address | varchar(300) | NULL |
| google_maps_url | text | NULL |
| status | enum | active, hidden |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

content tương ứng Mô tả; address tương ứng Địa chỉ; status chỉ có active/hidden vì AI chạy đồng bộ.

### roommate_posts

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| post_id | bigint | PK, FK posts |
| rent | numeric(12,2) | NOT NULL, >= 0 |
| people_needed | smallint | 1..20 |
| gender_preference | enum | male, female, any |
| area_m2 | numeric(6,2) | NULL |
| roommate_requirements | text | NULL |
| room_type | enum | private, shared, studio |
| district | varchar(100) | NULL |
| amenities | jsonb | array |
| contact_info | varchar(255) | NULL |

area_m2 là Diện tích; room_type/district/amenities/contact_info là extension từ UI.

### review_posts

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| post_id | bigint | PK, FK posts |
| place_name | varchar(200) | NOT NULL |
| place_type | enum | cafe, restaurant, street_food, photo, other |
| reference_price | numeric(12,2) | NULL |
| rating | smallint | 1..5 |
| experience | text | NULL |
| price_range | enum | low, medium, high |
| wifi_rating | smallint | 1..5, NULL |
| atmosphere_rating | smallint | 1..5, NULL |
| service_rating | smallint | 1..5, NULL |

place_address dùng address ở posts; sub-rating là extension từ UI.

### post_images

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| post_id | bigint | FK posts |
| sort_order | smallint | >= 0 |
| storage_key | text | NOT NULL |
| url | text | NOT NULL |
| alt_text | varchar(255) | NULL |
| mime_type | varchar(50) | NOT NULL |
| size_bytes | integer | NOT NULL |
| width | integer | NULL |
| height | integer | NULL |
| uploaded_at | timestamptz | NOT NULL |

UNIQUE (post_id, sort_order).

### comments

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| post_id | bigint | FK posts |
| author_id | bigint | FK users |
| content | text | 1..2000 |
| status | enum | active, hidden |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

### votes

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| user_id | bigint | FK users |
| post_id | bigint | FK posts |
| value | smallint | -1 hoặc 1 |
| created_at | timestamptz | NOT NULL |

PK: (user_id, post_id).

Review-only: trigger hoặc service check posts.post_type = review. Nếu muốn chặt ở DB, thêm trigger BEFORE INSERT/UPDATE.

### reports

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| post_id | bigint | FK posts, NULL |
| comment_id | bigint | FK comments, NULL |
| reporter_id | bigint | FK users |
| reason | enum | spam, abuse, misinformation, other |
| description | text | <= 1000 |
| status | enum | pending, resolved_keep, resolved_remove |
| resolved_by | bigint | FK users, NULL |
| resolution_note | text | NULL |
| created_at | timestamptz | NOT NULL |
| resolved_at | timestamptz | NULL |

CHECK: đúng một trong post_id/comment_id.  
CHECK: pending thì resolved_by/resolved_at NULL; khác pending thì NOT NULL.  
UNIQUE: (reporter_id, post_id) và (reporter_id, comment_id), có điều kiện NULL.

### moderation_logs

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| post_id | bigint | FK posts, NULL |
| comment_id | bigint | FK comments, NULL |
| content_type | enum | post, comment |
| result | enum | approved, pending_review, rejected |
| labels | jsonb | tag/scores |
| violation_group | varchar(50) | NULL |
| confidence | numeric(5,4) | NULL |
| reason | text | NULL |
| policy_version | varchar(50) | NOT NULL |
| model_version | varchar(100) | NOT NULL |
| scanned_at | timestamptz | NOT NULL |

CHECK: đúng một trong post_id/comment_id. Append-only.

### post_tags

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| post_id | bigint | FK posts |
| tag | varchar(40) | NOT NULL |

PK: (post_id, tag).

### notifications

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| user_id | bigint | FK users |
| title | varchar(200) | NOT NULL |
| message | text | NOT NULL |
| type | enum | info, warning, success, error |
| read | boolean | default false |
| created_at | timestamptz | NOT NULL |

## 4. Class diagram cần sửa

### 4.1. Người dùng / Yêu cầu xác thực

Cũ: Người dùng có Mã OTP (băm), Hạn OTP, Số lần thử OTP.

Mới: chuyển sang Yêu cầu xác thực gồm email, university_id, otp_hash, otp_expires_at, attempts, status, sent_at, verified_at.

Người dùng chỉ còn email trường, trạng thái xác thực, university_id.

### 4.2. Sinh viên / Quản trị viên

Giữ kế thừa Người dùng.

- Sinh viên: major, cohort.
- Quản trị viên: admin_level, appointed_at.
- student_id và contact vẫn ở Người dùng.

### 4.3. Bài đăng / hai loại bài

Giữ kế thừa Bài đăng.

Ghi rõ quan hệ composition one-to-one ở DB: posts.id = roommate_posts.post_id = review_posts.post_id.

### 4.4. Bình chọn

Cũ: gắn với Bài đăng.

Mới: gắn với Bài review theo BR7. Nếu vẫn vẽ vào Bài đăng, ghi chú ràng buộc review-only.

### 4.5. Báo cáo

Bổ sung resolved_by, resolution_note, resolved_at.

Quan hệ: gắn đúng một trong Bài đăng/Bình luận; Quản trị viên 1–N Báo cáo xử lý.

### 4.6. Nhật ký kiểm duyệt

Bổ sung policy_version, model_version, labels/scores, content_type.

Quan hệ: gắn đúng một trong Bài đăng/Bình luận; mỗi revision có log riêng.

### 4.7. Ảnh bài đăng

Bổ sung post_id, alt_text, UNIQUE(post_id, sort_order).

### 4.8. ID type

Class cũ ghi int. Chốt dùng bigint cho tất cả PK/FK; cập nhật class diagram int -> bigint.

## 5. Mapping EERD cũ → bảng mới

| EERD cũ | Bảng mới | Thay đổi |
|---|---|---|
| Trường | universities | Giữ |
| Tên miền trường | university_domains | Tách bảng, thêm domain_type |
| Người dùng | users | Bỏ OTP fields |
| Yêu cầu xác thực | verification_requests | Thêm OTP hash/expiry/attempts |
| Quản trị viên | admin_profiles | Giữ |
| Sinh viên | student_profiles | Giữ |
| Bài đăng | posts | Giữ, thêm status async |
| Bài tìm roommate | roommate_posts | Giữ, thêm field UI |
| Bài review | review_posts | Giữ, thêm field UI |
| Ảnh bài đăng | post_images | Giữ |
| Bình luận | comments | Giữ |
| Bình chọn | votes | Giữ, review-only |
| Báo cáo | reports | Giữ, thêm resolution |
| Nhật ký kiểm duyệt | moderation_logs | Giữ, thêm version/labels |

## 6. ERD rút gọn

~~~mermaid
erDiagram
    universities ||--o{ university_domains : has
    universities ||--o{ users : belongs
    users ||--o| student_profiles : student
    users ||--o| admin_profiles : admin
    users ||--o{ verification_requests : requests
    users ||--o{ posts : writes
    posts ||--o| roommate_posts : roommate
    posts ||--o| review_posts : review
    posts ||--o{ post_images : has
    posts ||--o{ comments : has
    posts ||--o{ votes : receives
    users ||--o{ votes : casts
    posts ||--o{ reports : reported_post
    comments ||--o{ reports : reported_comment
    users ||--o{ reports : reports
    posts ||--o{ moderation_logs : scanned_post
    comments ||--o{ moderation_logs : scanned_comment
    posts ||--o{ post_tags : tagged
    users ||--o{ notifications : receives
~~~

## 7. Vấn đề mở

1. **Lưu trữ ảnh production:** chốt S3 hay MinIO, thời hạn giữ file và backup.
2. **Audit nội dung bị AI từ chối:** hiện không lưu nội dung bị từ chối; nếu cần khiếu nại thì phải bổ sung bảng log riêng.
3. **Bộ dữ liệu demo:** chốt seed data cho buổi bảo vệ.

## 8. Kết luận

- 14 thực thể cốt lõi giữ nguyên.
- Class diagram đã sửa OTP, Bình chọn, Báo cáo, Nhật ký, Ảnh, ID type.
- Database có thêm post_tags, notifications, sessions; không có moderation_jobs.
- Mô hình tuân thủ EERD/class diagram ở mức logic, với các điều chỉnh đã ghi nhận.
