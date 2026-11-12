# components/profile

`StudentVerificationForm` gọi hai OTP demo routes; mã OTP local là `123456`.

`ProfileDashboard` nhận user, bài đăng và bình luận từ server page; cho phép sửa qua API mutation hiện có và xóa sau khi xác nhận. Bài đăng/bình luận đã sửa vẫn đi qua moderation adapter.
