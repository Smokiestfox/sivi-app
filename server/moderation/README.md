# Kiểm duyệt văn bản

Next.js gọi Laya Multilingual qua `POST /v1/systemone`. Năm câu hỏi độc lập
đánh giá `violence`, `sex`, `ragebait`, `review` và `ask`. Bài dài được
chia thành các đoạn chồng lấn và giữ điểm cao nhất của từng nhãn.

- Từ chối nếu điểm bạo lực hoặc tình dục từ 0,90.
- Đăng và gắn `needsReview` nếu một trong hai điểm trên lớn hơn 0,15 hoặc
  điểm ragebait từ 0,50.
- Ghi nhãn, điểm và phiên bản policy vào nhật ký cùng nội dung được duyệt.
- Khi hết 10 giây hoặc Laya trả lỗi, dữ liệu thiếu hay văn bản bị cắt, trả 503.

Chạy 10 bài mẫu trên PowerShell với `.env` đã có `LAYA_URL` và `LAYA_API_KEY`:

~~~powershell
$env:SIVI_TEST_LAYA = '1'
node --env-file=.env node_modules/vitest/vitest.mjs run tests/moderation.live.test.ts
~~~
