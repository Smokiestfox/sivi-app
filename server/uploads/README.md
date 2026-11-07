# server/uploads

Xử lý ảnh trong request tạo/sửa bài, không có endpoint upload rời.

- Nhận file từ multipart của POST/PATCH bài.
- Dùng `sharp` giải mã để xác thực ảnh; giới hạn size, không tin MIME từ client.
- sharp resize + strip EXIF.
- Lưu local trong `storage/`.
- Ghi post_images trong cùng transaction với bài.
- Nếu transaction lỗi, xóa file vừa ghi.
