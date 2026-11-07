# server/moderation

Sẽ chứa:

- gọi Python AI service.
- policy engine: pass hoặc reject.
- Ghi tags/scores và cờ `needs_review` vào moderation_logs.
- Mức điểm trung gian/ragebait vẫn được đăng ACTIVE, Admin có thể xem log flagged.
- fail closed khi lỗi/timeout.
- ghi moderation_logs.
