# Bàn giao backend forum

Server Components đọc trực tiếp từ service. Các route dưới đây xử lý ghi và trả JSON. Tài khoản gọi route phải là student đã xác thực. Header `Origin` phải khớp origin của `APP_URL`.

## Đọc dữ liệu

- `listPosts({ type, cursor?, limit?, q?, district?, maxPrice?, viewerId? })` và `getPost(id, viewerId?)` từ `server/posts/service.ts`. Feed theo ID giảm dần. `district` và `maxPrice` dùng cho roommate. `getPost` trả `null` khi bài không hiển thị.
- `listComments(postId, { cursor?, limit? })` từ `server/comments/service.ts`. Bình luận theo ID tăng dần. Chỉ trả bình luận active thuộc bài active.
- `listOwnPosts(authorId, { cursor?, limit? })` và `listOwnComments(authorId, { cursor?, limit? })` phục vụ trang cá nhân. Truyền ID lấy từ session trên server. Hai hàm trả nội dung đang hiển thị mà người dùng có thể sửa/xóa.
- Danh sách trả `{ items, nextCursor }`. Dùng nguyên `nextCursor` của trang trước. DTO gồm author công khai, thời gian ISO và dữ liệu riêng theo loại bài. `PostDto` gồm ảnh, số bình luận active, số up/down vote và `currentUserVote` nếu có `viewerId`.

## Ghi dữ liệu

| Method và đường dẫn | Body | Thành công |
|---|---|---|
| `POST /api/posts` | Multipart | 201 PostDto |
| `PATCH /api/posts/:id` | Multipart và `keepImageIds` | 200 PostDto |
| `DELETE /api/posts/:id` | — | 200 `{ ok: true }` |
| `POST /api/posts/:id/comments` | JSON `{ content }` | 201 CommentDto |
| `PATCH /api/comments/:id` | JSON `{ content }` | 200 CommentDto |
| `DELETE /api/comments/:id` | — | 200 `{ ok: true }` |
| `POST /api/posts/:id/vote` | JSON `{ value: 1 }` hoặc `{ value: -1 }` | 200 `{ counts: { upvotes, downvotes }, currentUserVote }` |

Gửi trường multipart `payload` bằng `JSON.stringify` và thêm từng file vào trường `images`. Tối đa 5 ảnh/bài, 5 MB/ảnh. Khi sửa, gửi payload đầy đủ cùng `keepImageIds` là JSON array (dùng `[]` nếu bỏ tất cả ảnh cũ). Ảnh giữ lại giữ thứ tự tương đối, ảnh mới nối vào cuối. Route lưu URL ảnh do upload service trả về.

Hai payload tối thiểu

~~~json
{ "type": "roommate", "title": "Tìm bạn cùng phòng", "content": "Phòng gần trường", "rent": 2000000, "peopleNeeded": 2, "roomType": "shared" }
~~~

~~~json
{ "type": "review", "title": "Review quán cà phê", "content": "Không gian yên tĩnh", "placeName": "Cafe A", "placeType": "cafe", "rating": 4, "priceRange": "medium" }
~~~

Các trường tùy chọn nằm trong `server/posts/payload.ts`. Schema hiện lưu nhãn AI trong moderation log và đã bỏ bảng `post_tags`. Khi nhận JSON thành công, UI có thể gọi `router.refresh()`.

Lỗi trả `{ error: { code, message, fields? } }`. Dùng `message` để hiện lỗi chung và `fields` để gắn lỗi vào form. Mã thường gặp gồm 400 sai dữ liệu, 401 chưa đăng nhập, 403 sai quyền/Origin, 404 nội dung đã ẩn hoặc mất, 409 bản sửa đã cũ, 413 body quá lớn, 422 nội dung bị AI từ chối và 503 khi dịch vụ phụ thuộc chưa sẵn sàng.

## Ghép với các module của nhóm

Điểm nối duy nhất ở `server/forum/dependencies.ts`. Dùng kiểu trong `contracts.ts` để viết adapter khi các module được merge.

- **AUTH-01** — `getActor(request)` dùng `getCurrentUser(request)` từ `server/auth/service.ts`. Hàm trả `null` khi thiếu session, token sai hoặc phiên hết hạn. Xem [hướng dẫn cấu hình Google và các guard](../auth/README.md).
- **Bách / AI-02** — `moderate(input)` chuyển `contentType`, ID nếu có, `title` và `body` sang contract AI. Adapter áp dụng policy và timeout, rồi trả kết quả chuẩn hóa. Throw khi lỗi hoặc không có kết quả hợp lệ. Forum ghi log approval trong cùng transaction với nội dung. Kết quả reject không tạo bài/bình luận.
- **Đạt / IMG-01** — `saveImage(file)` xác thực nội dung ảnh, xử lý và trả metadata với storage key duy nhất. Nếu throw, adapter dọn file nó vừa ghi. `removeImage(storageKey)` nhận key do server cấp và chạy lặp an toàn. Khi DB rollback, forum dọn file mới nếu DB xác nhận chưa được tham chiếu. Khi sửa hoặc xóa thành công, forum dọn ảnh cũ sau commit.

Các adapter moderation và ảnh từ chối ghi cho đến khi module tương ứng được ghép. Kiểm thử PostgreSQL chạy bằng schema tạm trong DB test. Test forum dùng test doubles cho session, moderation và ảnh. Test Auth dùng session DB thật với nhà cung cấp OIDC mô phỏng. Đặt `SIVI_TEST_DATABASE_URL` trỏ đến database test riêng với quyền tạo schema, rồi chạy `npm test`. Các test không cần DB vẫn chạy khi biến này chưa được đặt.
