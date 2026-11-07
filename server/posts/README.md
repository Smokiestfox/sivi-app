# server/posts

Sẽ chứa:

- createPost / updatePost / deletePost.
- listPosts / getPost.
- upload ảnh liên kết post_images.
- transaction tạo post + roommate/review + ảnh + moderation_log.

Server Component đọc dữ liệu bằng service. Service chứa nghiệp vụ và gọi Drizzle trực tiếp; route handler không viết query.
