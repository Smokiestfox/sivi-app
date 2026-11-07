# server/uploads

Sẽ chứa:

- nhận multipart, kiểm tra magic bytes/MIME/size.
- sharp resize + strip EXIF.
- lưu storage hoặc S3.
- trả image id để gắn vào bài.
