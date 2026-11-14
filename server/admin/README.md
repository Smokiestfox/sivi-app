# Admin reports — ADM-01/02

`service.ts` dùng schema hiện có: `posts.status`, `comments.status`,
`reports.status/resolvedBy/resolvedAt/resolutionNote` và `moderation_logs`.
Không thêm bảng, notification hoặc cơ chế tự động gỡ khi đủ số báo cáo.

## Xác thực quản trị

`requireAdmin()` dùng guard session từ `server/auth/service.ts` và chuyển lỗi
thành `AdminError` 401 (chưa đăng nhập) hoặc 403 (thiếu quyền).
Cả `/admin` và API đều gọi guard trước khi đọc/ghi. Service còn kiểm tra lại role
admin trong DB; dữ liệu từ client không quyết định quyền.

## Đọc và xử lý

- Server Component `/admin` gọi `listReportQueue(adminId, status)` trực tiếp.
  `status` là `pending` hoặc `processed`; không thêm REST API đọc.
- Mỗi card là một target, chứa tất cả báo cáo phù hợp trạng thái, tổng số báo cáo,
  nội dung, người báo cáo, tác giả và kết quả AI mới nhất nếu có.
- `POST /api/admin/reports/{reportId}` nhận `{ decision: "keep" | "remove", note?: string }`.
  Ghi chú tùy chọn, tối đa 1000 ký tự; client không gửi admin id.
- `resolveReportCluster` kiểm quyền trong transaction. Khóa bài cha trước bình luận,
  rồi khóa cụm báo cáo; kiểm lại báo cáo được chọn còn pending sau khi lấy khóa.
  Hai quyết định đồng thời cho cùng cụm chỉ có một quyết định được chấp nhận.
- Giữ: để nguyên nội dung, đóng tất cả báo cáo pending thành `resolved_keep`.
- Gỡ: đặt đúng bài/bình luận thành `hidden`, đóng pending thành `resolved_remove`.
  Ghi admin, thời điểm, ghi chú trong cùng transaction; lỗi DB rollback cả hai phần.
- Không sửa lịch sử các báo cáo đã xử lý. Không dùng Giữ để khôi phục nội dung hidden.
  Với nội dung đã hidden nhưng còn báo cáo pending, Gỡ có thể đóng cụm còn lại.
- Schema hiện dùng `ON DELETE CASCADE`: xóa hẳn target cũng xóa báo cáo của nó.
  Thao tác trên id đã biến mất trả 404 và yêu cầu tải lại, không tạo lịch sử giả.
- Sau thành công route yêu cầu revalidate trang Admin, feed, chi tiết và profile;
  client `router.refresh()` để lấy lại dữ liệu server. Public readers của Chính
  đã lọc trạng thái hidden của cả bài và bình luận.

API trả lỗi `{ error: string, code: string }`, status 400/401/403/404/409/415/500/503.
409 khi cụm đã được xử lý hoặc chọn Giữ cho nội dung đã ẩn. Success trả decision,
processedCount, targetType/targetId, postId, resolvedAt và message.

## Kiểm thử

- `tests/admin.test.ts`: validation, quyền, grouping, quyết định cụm, HTTP và cache
  invalidation với DB mock. Không thay cho kiểm thử transaction PostgreSQL thật.
- `tests/admin.integration.test.ts`: PostgreSQL thật, rollback bằng trigger lỗi,
  hai quyết định đồng thời, báo cáo mới đua với gỡ bình luận và public readers.
  Cần `SIVI_TEST_DATABASE_URL` trỏ DB kiểm thử riêng; fixture tạo schema ngẫu nhiên
  và dọn schema khi kết thúc, dùng cùng cách với tests forum của Chính.
- Khi chưa cấu hình DB kiểm thử, suite integration được skip rõ ràng.

Auth thật, DB integration và review transaction của Chính/guard của Đạt vẫn là
các bước cần hoàn tất trước nghiệm thu ADM-01/02.
