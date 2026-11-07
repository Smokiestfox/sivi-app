# server/uploads

Xử lý ảnh trong request tạo/sửa bài, không có endpoint upload rời.

- Nhận file từ multipart của POST/PATCH bài.
- Kiểm tra magic bytes, MIME, size.
- sharp resize + strip EXIF.
- Lưu storage hoặc S3.
- Ghi post_images trong cùng transaction với bài.
- Nếu transaction lỗi, xóa file vừa ghi.
