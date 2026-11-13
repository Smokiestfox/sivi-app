# Lưu trữ ảnh bài đăng

- Ảnh nằm trong `STORAGE_DIR/posts/`; `STORAGE_DIR` mặc định là `./storage`.
- `storageKey` là UUID do server tạo, có hậu tố `.webp`. Không dùng tên file
  từ client và không nhận đường dẫn tùy ý khi xóa.
- `url` có dạng `/media/posts/{storageKey}`. Route chỉ phục vụ key đúng định
  dạng từ thư mục ảnh bài đăng; file không tồn tại trả 404.
- Upload chấp nhận JPEG, PNG và WebP dựa trên nội dung thực, tối đa
  `MAX_UPLOAD_BYTES` (mặc định 5 MiB). Ảnh được xoay theo EXIF, thu nhỏ trong
  khung 1600×1600, chuyển thành WebP và bỏ metadata.
- File được ghi tạm rồi rename nguyên tử. `removeImage` an toàn khi gọi lặp;
  forum xóa file mới nếu ghi DB thất bại và xóa ảnh cũ sau khi cập nhật/xóa bài
  commit thành công.
- Nội dung file bị gitignore; chỉ commit tài liệu này, không commit ảnh runtime,
  `.env` hay dữ liệu người dùng.
