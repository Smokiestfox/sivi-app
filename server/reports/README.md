# server/reports

## REP-01: tạo báo cáo

`createReport(reporterId, body)` trong `service.ts` dùng schema Drizzle hiện tại.
`reporterId` phải lấy từ phiên đăng nhập ở server. Service kiểm tra lại user còn
tồn tại, có role `student` và `isVerified = true` trong database.

`POST /api/reports` nhận JSON gồm chính xác một `postId` hoặc `commentId`
(số nguyên dương an toàn), `reason` và `description` tùy chọn:

```json
{ "postId": 42, "reason": "spam", "description": "Nội dung lặp lại" }
```

- `reason`: `spam`, `abuse`, `misinformation`, `other`, theo enum trong schema.
- `description`: tối đa 1000 ký tự, mặc định chuỗi rỗng.
- Chỉ báo cáo nội dung active. Với bình luận, bài cha cũng phải active.
- Kiểm tra target và ghi báo cáo pending trong transaction; giữ shared row lock
  để nội dung không bị gỡ/xóa giữa lúc kiểm tra và ghi.
- Unique index trong DB chặn trùng kể cả nhiều request đồng thời. Không tự ẩn nội dung.
- Route kiểm tra Origin theo `APP_URL`, chỉ nhận JSON và không nhận `reporterId` từ client.

Thành công: HTTP 201, `{ report: { id, status, createdAt }, message }`.
Lỗi: `{ error, code }`, với HTTP 400 dữ liệu sai, 401 chưa đăng nhập,
403 thiếu quyền/Origin sai, 404 nội dung không còn công khai, 409 trùng,
415 sai Content-Type, 500 lỗi hệ thống.

## Xác thực sinh viên

`requireReportStudent(request)` dùng guard session từ `server/auth/service.ts`.
API trả 401 khi chưa đăng nhập và 403 khi tài khoản chưa xác thực sinh viên.

## REP-02: UI và điểm gắn cho An

`components/interaction/ReportForm.tsx` giữ visual form từ nhánh `an`, dùng dialog
native để hỗ trợ focus và Escape. Form giữ lý do/ghi chú khi lỗi, thông báo trùng,
thiếu quyền và thành công. Khi mở lại hoặc đổi target, form bắt đầu bản nháp mới.

Trang chi tiết có thể gắn nút trực tiếp, truyền user đã đọc từ session ở server:

```tsx
import { ReportButton } from "@/components/interaction/ReportForm";

<ReportButton postId={post.id} user={user} />
```

`user` cần có `role` và `isVerified`, hoặc `null` khi chưa đăng nhập. Dữ liệu này
chỉ quyết định UI; API vẫn kiểm quyền ở server. `CommentList` nhận thêm prop `user`
để hiện nút báo cáo cho từng bình luận. Nút chỉ hiện cho student đã xác thực.
Các trang forum hiện chưa được tạo; An cần gắn component khi làm UI-03.

## Kiểm tra và phần tiếp theo

`tests/reports.test.ts` kiểm tra validation, quyền, target không khả dụng, xung đột
trùng, receipt và lỗi HTTP bằng DB/auth mock. Test này chưa thay cho kiểm thử
trên PostgreSQL thật. Cần chạy lại luồng thật sau khi Đạt bàn giao auth và DB demo.

ADM-01/02 chưa thuộc REP-01/02. Các phần tiếp theo theo checklist từ main:

- Admin đọc danh sách báo cáo pending/processed.
- Admin giữ/gỡ nội dung và cập nhật tất cả báo cáo cùng target.
- Chủ bài xem trạng thái HIDDEN trong “Bài của tôi” với nhãn “đã bị gỡ”.
