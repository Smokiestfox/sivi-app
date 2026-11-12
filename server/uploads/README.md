# server/uploads

Xử lý ảnh trong request tạo/sửa bài, không có endpoint upload rời.

- Nhận file từ multipart của POST/PATCH bài.
- Chỉ nhận JPEG/PNG/WebP, tối đa 5 MB; xác thực chữ ký tệp và giải mã metadata bằng `sharp`.
- Tên file UUID, lưu local trong `public/uploads/` và trả URL static `/uploads/<uuid>.<ext>`.
- Ghi post_images trong cùng transaction với bài.
- Nếu transaction lỗi, xóa file vừa ghi.
- Xóa file sau khi bài bị xóa hoặc ảnh bị gỡ khỏi bài.
