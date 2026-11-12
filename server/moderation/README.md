# server/moderation

Adapter moderation của nhánh demo:

- Chờ 4,5 giây để UI thể hiện trạng thái đang kiểm duyệt.
- Mặc định pass; nội dung chứa `test_vi_pham` bị reject với lý do giả lập.
- Kết quả pass được ghi vào `moderation_logs` cùng transaction của bài/bình luận. Kết quả reject khi sửa nội dung được ghi log trước khi trả lỗi; nội dung bị từ chối lúc tạo chưa có target row để tham chiếu.
- Python AI service chưa được gọi bởi adapter demo.
