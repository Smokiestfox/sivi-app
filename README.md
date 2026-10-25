# SiVi

SiVi là diễn đàn sinh viên để tìm roommate, chia sẻ review địa điểm và quản lý nội dung cộng đồng. Ứng dụng dùng Next.js App Router, API Route Handlers và PostgreSQL.

## Tính năng

- Trang `/`: danh sách roommate, tìm kiếm theo nội dung, lọc khu vực/giá, trang chi tiết và bình luận.
- Trang `/review`: xem và lọc review; chỉ review có upvote/downvote.
- Đăng nhập Google; tài khoản mới ở vai trò khách và chỉ có quyền xem.
- Xác thực email trường bằng OTP 6 số, băm trước khi lưu, hết hạn sau 5 phút và khóa sau 5 lần nhập sai.
- Đăng/sửa bài roommate hoặc review, bình luận và sửa bình luận đều phải qua AI moderation trước khi ghi database.
- Báo cáo bài viết/bình luận; mỗi tài khoản chỉ báo cáo một lần cho từng nội dung.
- Trang `/profile` quản lý bài viết, bình luận và thông báo của mình.
- Trang `/admin` dùng Ant Design để giữ/gỡ nội dung bị báo cáo; gỡ nội dung sẽ ẩn khỏi diễn đàn và tạo thông báo cho chủ nội dung.

## Chạy local

Yêu cầu Node.js 20.9 trở lên, Docker và các cấu hình Google OAuth, SMTP, AI moderation.

1. Tạo file cấu hình và khởi động PostgreSQL:

   ```bash
   cp .env.example .env
   docker compose up -d postgres
   ```

2. Cấu hình các giá trị trong `.env`:

   - `APP_URL`: URL gốc của ứng dụng; local dùng `http://localhost:3000`.
   - `DATABASE_URL`: chuỗi kết nối PostgreSQL.
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: OAuth client; thêm callback `http://localhost:3000/api/auth/google/callback` trong Google Cloud Console.
   - `ADMIN_EMAILS`: danh sách email Google quản trị, phân tách bằng dấu phẩy.
   - `SMTP_URL`, `EMAIL_FROM`: SMTP dùng gửi OTP sinh viên.
   - `AI_MODERATION_URL`: HTTPS endpoint kiểm duyệt; tùy chọn `AI_MODERATION_API_KEY` nếu dịch vụ yêu cầu Bearer token.

3. Tạo bảng và dữ liệu danh mục trường:

   ```bash
   npm run db:migrate
   ```

4. Cài dependencies và khởi chạy:

   ```bash
   npm install
   npm run dev
   ```

Các lệnh `npm run lint`, `npx tsc --noEmit` và `npm run build` dùng để kiểm tra mã nguồn.

## Mock data

Các fixture TypeScript dùng cho phát triển giao diện và kiểm thử nằm trong `data/mock/`:

- `users.ts` và `roommatePosts.ts`: người dùng và bài tìm roommate.
- `reviewPosts.ts`: bài review địa điểm.
- `comments.ts`: bình luận gắn với bài roommate/review.
- `reports.ts`: báo cáo bài viết/bình luận cùng kết quả moderation để thử màn admin.
- `notifications.ts`: thông báo trên trang cá nhân.

Các fixture này không được API nạp tự động và không được ghi vào PostgreSQL. Muốn dựng dữ liệu demo hiển thị qua API, hãy thêm seed riêng trong `db/seeds/` và một lệnh chạy chỉ định rõ cho môi trường development; không dùng fixture thay cho OTP, OAuth hoặc kết quả AI moderation thật.

## Hợp đồng AI moderation

SiVi gửi JSON `POST` đến `AI_MODERATION_URL`:

```json
{ "content": "Nội dung cần kiểm duyệt", "context": "post" }
```

`context` là `post` hoặc `comment`. Endpoint phải trả HTTP 2xx và JSON có `passed` kiểu boolean. Ví dụ:

```json
{ "passed": false, "reason": "Nội dung vi phạm quy định", "flaggedKeywords": ["..."] }
```

Nếu endpoint thiếu cấu hình, timeout sau 10 giây, trả lỗi hoặc response sai định dạng, API từ chối thao tác với thông báo “Hệ thống đang bận, vui lòng thử lại sau”; nội dung không được ghi vào database. SiVi không giả lập kết quả moderation. Nếu model chạy local, đặt URL endpoint nội bộ của model adapter tại `AI_MODERATION_URL`.

## Lưu ý triển khai

- Không đưa secret vào Git; `.env` đã được ignore. `.env.example` chỉ chứa giá trị mẫu.
- Không mở API PostgreSQL trực tiếp ra Internet. Dùng TLS, backup database và cấu hình secrets ở môi trường deploy.
- Ảnh bài viết nhận URL HTTPS; hiện chưa tích hợp dịch vụ upload/object storage.
- Không có cấu hình Google, SMTP, AI hoặc PostgreSQL thật trong repo. Các luồng tương ứng yêu cầu cung cấp dịch vụ và secrets trước khi hoạt động; hệ thống báo lỗi rõ ràng và fail closed thay vì trả kết quả giả.
