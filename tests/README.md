# tests

Kiểm thử tối thiểu cho nhóm 5 người:

- Vitest cho quy tắc nghiệp vụ trong `server/`; thêm test cạnh từng tính năng khi triển khai.
- pytest cho AI service/client.
- PostgreSQL test riêng nếu một test cần DB; không dùng DB dev.
- Không dùng Playwright cho đồ án.

Hiện chỉ có smoke test health và kiểm tra AI fail closed vì tính năng nghiệp vụ chưa được triển khai.
Chạy bằng `npm test` và `Set-Location ai-service; uv run pytest`.
