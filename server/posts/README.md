# server/posts

Sẽ chứa:

- createPost / updatePost / deletePost.
- listPosts / getPost.
- upload ảnh liên kết post_images.
- transaction tạo post + roommate/review + ảnh + tag + moderation_log.

Route handler chỉ gọi service, không viết SQL trực tiếp.
