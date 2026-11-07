# SiVi — Đặc tả thiết kế hệ thống

**Đồ án:** Đồ án Tổng hợp – hướng Công nghệ Phần mềm (CO3103)  
**Đề tài:** SiVi – Nền tảng forum tìm roommate và review địa điểm cho sinh viên khu Làng Đại học  
**Lớp:** L07 · **Nhóm:** L07-1  
**Giảng viên hướng dẫn:** Trần Thị Ngọc Trâm

| STT | Họ tên | MSSV |
|---:|---|---|
| 1 | Trịnh Quốc An | 2410046 |
| 2 | Phan Thanh Bình | 2410357 |
| 3 | Nguyễn Vũ Bách | 2410208 |
| 4 | Nguyễn Minh Đạt | 2410694 |
| 5 | Ngô Quý Chính | 2410405 |

> Đây là tài liệu tham khảo yêu cầu nghiệp vụ và UI. PDF và thư mục hình minh họa được dẫn trong tài liệu gốc hiện không có trong skeleton này. Khi có điểm khác nhau, dùng các quyết định MVP trong [architecture.md](architecture.md), [data-model.md](data-model.md), [diagrams.md](diagrams.md) và [testing.md](testing.md) làm nguồn thực hiện.

> **Phạm vi MVP cho nhóm 5 người:** làm theo P0 trước (UC01, UC02, UC03–UC06, UC09), tiếp đến P1 (UC07 bắt buộc, UC08, UC10–UC11); chỉ làm P2 (UC12–UC14) nếu còn thời gian. Không triển khai hàng đợi/worker, kiểm duyệt tệp bằng OCR/ASR, REST API đọc, thông báo trong app hay hạ tầng VPS cho demo.

---

## 1. Tổng quan dự án

### 1.1. Bối cảnh và mục tiêu

Sinh viên khu Làng Đại học thường tìm roommate, tìm trọ và tìm hiểu địa điểm ăn uống, cafe, photo qua các group mạng xã hội. Thông tin phân tán, khó tìm lại, thiếu kiểm soát nội dung và không bảo đảm người đăng là sinh viên.

SiVi là web app dạng forum dành riêng cho sinh viên khu Làng Đại học, gồm hai chức năng chính:

- Forum tìm roommate/trọ.
- Forum review địa điểm.

Cả hai loại bài đều hỗ trợ bình luận. Mục tiêu:

- Tập trung thông tin roommate/trọ và review địa điểm vào một nơi, dễ đăng và dễ tìm.
- Giới hạn quyền tương tác (đăng bài, bình luận, báo cáo) cho sinh viên đã xác thực bằng OTP gửi tới email trường.
- Tự động kiểm duyệt nội dung bằng AI trước khi hiển thị, kết hợp báo cáo của người dùng và xử lý thủ công của Admin.

### 1.2. Phạm vi

**Trong phạm vi:**

- Đăng nhập bằng Google OAuth; tài khoản thường chỉ được xem nội dung.
- Xác thực sinh viên bằng OTP gửi tới email trường; tên miền phải nằm trong danh sách trường được hỗ trợ.
- Forum roommate/trọ và forum review địa điểm, có CRUD cho bài đăng của chính mình.
- Up/down vote chỉ có ở bài review; bài roommate không có vote.
- Bình luận trên cả hai loại bài; người viết được sửa/xóa bình luận của mình.
- AI moderation cho mọi bài đăng và bình luận, kể cả khi sửa lại, trước khi hiển thị.
- Báo cáo bài vi phạm; Admin xử lý báo cáo và gỡ nội dung.

**Ngoài phạm vi:**

- Xác thực bằng ảnh thẻ sinh viên hoặc OCR (đã thay bằng OTP qua email trường).
- AI moderation cho ảnh; AI chỉ kiểm tra nội dung văn bản.
- Nhắn tin riêng giữa người dùng; liên hệ qua thông tin contact trong bài đăng.

### 1.3. Tech stack

| Thành phần | Công nghệ |
|---|---|
| Web | Next.js full-stack, React, TypeScript, Ant Design |
| Database | PostgreSQL, Drizzle ORM, Zod |
| Authentication | `openid-client` cho Google OAuth; OTP và session do ứng dụng quản lý |
| AI moderation | FastAPI + Laya Multilingual chạy local, Next.js gọi đồng bộ |
| Ảnh | Lưu local trong `storage/`, dùng `sharp` để xác thực và resize |
| Test | Vitest cho business rule; pytest cho AI service |
| UI design | Figma |

### 1.4. Vai trò và quyền

| Vai trò | Quyền |
|---|---|
| Người dùng (Google) | Đăng nhập bằng Google, xem bài roommate và review, yêu cầu xác thực sinh viên. |
| Sinh viên đã xác thực | Mọi quyền của Người dùng, cộng thêm đăng bài, bình luận, báo cáo, vote bài review. |
| Admin (thành viên nhóm) | Xử lý báo cáo, gỡ nội dung vi phạm (bài hoặc bình luận). |
| AI Service | Kiểm duyệt nội dung tự động; model chạy local, gọi qua API. |

### 1.5. Nhóm tính năng

| Mã | Tính năng | Use case liên quan |
|---|---|---|
| F1 | Tài khoản và xác thực sinh viên bằng OTP | UC01, UC02 |
| F2 | Forum tìm roommate/trọ | UC03, UC04 |
| F3 | Forum review địa điểm quanh Làng Đại học | UC05, UC06, UC13 |
| F4 | Bình luận trên cả hai loại bài | UC07 |
| F5 | Kiểm duyệt tự động bằng AI trước khi đăng | UC09 |
| F6 | Báo cáo và xử lý vi phạm | UC08, UC10, UC11 |
| F7 | Quản lý (sửa/xóa) bài đăng và bình luận của mình | UC12, UC14 |

### 1.6. Business rules

| ID | Quy tắc |
|---|---|
| BR1 | Đăng nhập Google thường chỉ được xem. Đăng bài, bình luận, báo cáo yêu cầu đã xác thực. |
| BR2 | Xác thực bằng OTP gửi tới email trường; tên miền phải nằm trong danh sách trường được hỗ trợ. |
| BR3 | OTP gồm 6 số, hết hạn sau 5 phút, nhập sai tối đa 5 lần thì không dùng được nữa. Người dùng có thể yêu cầu OTP mới. |
| BR4 | Mọi bài đăng và bình luận phải qua kiểm duyệt AI trước khi hiển thị. |
| BR5 | Nội dung bị báo cáo thì Admin xem thủ công và quyết định gỡ hoặc giữ. |
| BR6 | Mỗi email trường chỉ gắn với một tài khoản. |
| BR7 | Up/down vote chỉ có ở bài review; bài roommate không có vote (tương tác qua bình luận). |
| BR8 | Nội dung bị AI đánh giá vi phạm thì bị từ chối ngay lúc đăng, không lưu và không hiển thị. |
| BR9 | Nội dung không vi phạm nhưng nhạy cảm và bị nhiều người báo cáo thì Admin xem và xóa thủ công. |
| BR10 | Chỉ chủ bài mới sửa/xóa được bài của mình. Bài sau khi sửa phải qua kiểm duyệt AI lại. |
| BR11 | Chỉ chủ bình luận mới sửa/xóa được bình luận của mình. Bình luận sau khi sửa phải qua kiểm duyệt AI lại. |

### Thứ tự triển khai

| Ưu tiên | Use case | Phạm vi |
|---|---|---|
| P0 | UC01, UC02, UC03–UC06, UC09 | Google login, OTP, đăng và xem bài roommate/review, kiểm duyệt AI |
| P1 | UC07, UC08, UC10–UC11 | Bình luận (bắt buộc theo yêu cầu môn học), báo cáo, Admin xử lý/gỡ |
| P2 | UC12, UC14, UC13 | Sửa/xóa bài, sửa/xóa bình luận, vote; có thể cắt nếu thiếu thời gian |

---

## 2. Use-case model

### 2.1. Actor và quan hệ

- **Người dùng (Google)**: đăng nhập, xem bài, yêu cầu xác thực.
- **Sinh viên đã xác thực**: kế thừa Người dùng; đăng bài, bình luận, báo cáo, vote.
- **Admin**: xử lý báo cáo, gỡ nội dung.
- **AI Service**: kiểm duyệt nội dung tự động.

Quan hệ chính:

- UC09 được **include** bởi UC03, UC05, UC07, UC12 (khi sửa) và UC14 (khi sửa).
- UC11 **extend** UC10 khi nội dung bị kết luận vi phạm.
- UC13 **extend** UC06 (bài review).
- Sinh viên đã xác thực chuyên biệt hóa từ Người dùng (Google) nên kế thừa các use case xem bài và xác thực.

### 2.2. Danh sách use case

| ID | Use case | Primary actor | Feature |
|---|---|---|---|
| UC01 | Đăng nhập bằng Google | Người dùng (Google), Admin | F1 |
| UC02 | Xác thực sinh viên (OTP qua email trường) | Người dùng (Google) | F1 |
| UC03 | Đăng bài tìm roommate | Sinh viên đã xác thực | F2 |
| UC04 | Xem bài tìm roommate | Người dùng (Google) | F2 |
| UC05 | Đăng bài review địa điểm | Sinh viên đã xác thực | F3 |
| UC06 | Xem bài review địa điểm | Người dùng (Google) | F3 |
| UC07 | Bình luận bài đăng | Sinh viên đã xác thực | F4 |
| UC08 | Báo cáo nội dung vi phạm | Sinh viên đã xác thực | F6 |
| UC09 | Kiểm duyệt nội dung tự động | Hệ thống (use case gọi); AI Service | F5 |
| UC10 | Xử lý báo cáo | Admin | F6 |
| UC11 | Gỡ nội dung vi phạm | Admin | F6 |
| UC12 | Quản lý bài đăng của mình (sửa, xóa) | Sinh viên đã xác thực | F7 |
| UC13 | Up/down vote bài review | Sinh viên đã xác thực | F3 |
| UC14 | Quản lý bình luận của mình (sửa, xóa) | Sinh viên đã xác thực | F7 |

UC01, UC04 và UC06 không có scenario chi tiết trong tài liệu gốc.

### 2.3. UC02 — Xác thực sinh viên bằng OTP

**Mục tiêu:** nâng tài khoản Google thường (chỉ xem) thành Sinh viên đã xác thực bằng OTP gửi tới email trường.

**Tiền điều kiện:** đã đăng nhập Google và chưa xác thực.  
**Hậu điều kiện thành công:** email trường gắn vào tài khoản; vai trò nâng cấp; được đăng bài, bình luận, báo cáo.  
**Hậu điều kiện thất bại:** tài khoản vẫn chỉ xem; không gắn email trường; yêu cầu xác thực ghi nhận thất bại/hết hạn.

**Luồng chính:**

1. Hệ thống hiển thị form nhập email trường.
2. Người dùng nhập email và gửi.
3. Hệ thống kiểm tra tên miền thuộc danh sách trường hỗ trợ.
4. Hệ thống kiểm tra email chưa gắn với tài khoản khác.
5. Hệ thống sinh OTP 6 số, lưu bản băm kèm hạn 5 phút và gửi tới email trường.
6. Người dùng nhập OTP.
7. Hệ thống đối chiếu OTP đúng và còn hạn.
8. Hệ thống gắn email trường, nâng vai trò và thông báo thành công.

**Luồng thay thế / ngoại lệ:**

- **A1:** chọn “Gửi lại OTP” → vô hiệu OTP cũ, sinh OTP mới, quay lại bước 5.
- **A2:** hủy → quay về trang trước, tài khoản giữ nguyên mức chỉ xem.
- **E1:** tên miền không hợp lệ → báo lỗi, quay lại bước 1.
- **E2:** email trường đã gắn tài khoản khác (BR6) → báo lỗi, quay lại bước 1.
- **E3:** gửi email thất bại → báo lỗi, cho thử gửi lại.
- **E4:** OTP sai → cho nhập lại; sai 5 lần thì OTP không còn dùng được (BR3).
- **E5:** OTP hết hạn → báo lỗi, đề nghị gửi lại.
- **E6:** email vừa được tài khoản khác liên kết trong lúc chờ OTP → báo lỗi, không nâng quyền, quay lại bước 1.

### 2.4. UC03 — Đăng bài tìm roommate

**Mục tiêu:** sinh viên đăng bài tìm roommate/trọ sau khi nội dung qua kiểm duyệt.  
**Tiền điều kiện:** đã đăng nhập và đã xác thực.  
**Hậu điều kiện thành công:** bài được lưu, hiển thị trên forum roommate; kết quả kiểm duyệt ghi vào Nhật ký kiểm duyệt.  
**Hậu điều kiện thất bại:** bài không lưu, không hiển thị; nội dung còn trên form để sửa.

**Trường dữ liệu (theo luồng và UI):** tiêu đề, mô tả, khu vực/địa chỉ, quận/huyện, giá thuê, số người cần tìm, loại phòng, giới tính ưu tiên, thông tin liên hệ, tiện ích, ảnh (tùy chọn).

**Luồng chính:**

1. Hiển thị form đăng bài.
2. Sinh viên điền thông tin và gửi.
3. Hệ thống kiểm tra dữ liệu hợp lệ.
4. Hệ thống gọi UC09 để kiểm duyệt.
5. UC09 trả kết quả đạt.
6. Hệ thống lưu bài, ghi Nhật ký kiểm duyệt, hiển thị trên forum và thông báo thành công.

**Thay thế / ngoại lệ:**

- **A1:** đính kèm ảnh → lưu ảnh cùng bài.
- **A2:** hủy → không lưu gì, quay về forum.
- **E1:** thiếu trường bắt buộc hoặc sai định dạng → báo lỗi tại trường, quay lại bước 1.
- **E2:** UC09 đánh giá vi phạm → từ chối ngay, không lưu, báo lý do (BR8); sinh viên có thể sửa và gửi lại.
- **E3:** AI Service lỗi/timeout → từ chối đăng, báo hệ thống đang bận, giữ nội dung đã nhập.
- **E4:** tài khoản chưa xác thực → từ chối và chuyển sang UC02.

### 2.5. UC05 — Đăng bài review địa điểm

**Mục tiêu:** sinh viên đăng review một địa điểm quanh Làng Đại học sau khi qua kiểm duyệt.  
**Tiền điều kiện:** đã đăng nhập và đã xác thực.  
**Hậu điều kiện thành công:** bài review được lưu, hiển thị, có thể nhận vote và bình luận; kết quả kiểm duyệt được ghi log.  
**Hậu điều kiện thất bại:** bài không lưu, không hiển thị; nội dung còn trên form.

**Trường dữ liệu (theo luồng và UI):** tiêu đề, nội dung review, tên địa điểm, địa chỉ, loại địa điểm (quán ăn, cafe, photo...), đánh giá sao, mức giá, loại không gian, tiện ích, ảnh (tùy chọn).

**Luồng chính:**

1. Hiển thị form review.
2. Sinh viên điền thông tin và gửi.
3. Hệ thống kiểm tra dữ liệu hợp lệ.
4. Hệ thống gọi UC09 để kiểm duyệt.
5. UC09 trả kết quả đạt.
6. Hệ thống lưu bài, ghi Nhật ký kiểm duyệt, hiển thị trên forum review và thông báo thành công.

**Thay thế / ngoại lệ:** tương tự UC03 (ảnh tùy chọn; hủy; thiếu/sai dữ liệu; AI vi phạm; AI lỗi/timeout; chưa xác thực).

### 2.6. UC07 — Bình luận bài đăng

**Mục tiêu:** sinh viên viết bình luận dưới bài roommate hoặc bài review sau khi qua kiểm duyệt.  
**Tiền điều kiện:** đã xác thực và đang xem một bài đăng.  
**Hậu điều kiện thành công:** bình luận được lưu, hiển thị dưới bài; kết quả kiểm duyệt được ghi log.  
**Hậu điều kiện thất bại:** bình luận không lưu; sinh viên nhận lý do.

**Luồng chính:**

1. Sinh viên nhập nội dung bình luận và gửi.
2. Hệ thống kiểm tra nội dung không rỗng.
3. Hệ thống gọi UC09.
4. UC09 trả kết quả đạt.
5. Hệ thống lưu bình luận, ghi Nhật ký kiểm duyệt và hiển thị dưới bài.

**Thay thế / ngoại lệ:**

- **A1:** xóa nội dung đang nhập và hủy → không gửi gì.
- **E1:** nội dung rỗng → không gửi, báo lỗi.
- **E2:** UC09 đánh giá vi phạm → từ chối, không lưu, báo lý do (BR8).
- **E3:** AI Service lỗi/timeout → từ chối đăng, báo hệ thống đang bận, giữ nội dung.
- **E4:** bài đã bị gỡ/xóa trong lúc gửi → báo bài không còn tồn tại, không lưu.

### 2.7. UC08 — Báo cáo nội dung vi phạm

**Mục tiêu:** sinh viên báo cáo bài đăng hoặc bình luận vi phạm để Admin xem xét.  
**Tiền điều kiện:** đã xác thực và đang xem nội dung cần báo cáo.  
**Hậu điều kiện thành công:** báo cáo được tạo với trạng thái “chờ xử lý” và xuất hiện trong danh sách Admin.  
**Hậu điều kiện thất bại:** không có báo cáo nào được tạo.

**Luồng chính:**

1. Hệ thống hiển thị danh sách lý do (spam, nội dung xúc phạm, thông tin sai...).
2. Sinh viên chọn lý do và gửi.
3. Hệ thống tạo báo cáo trạng thái “chờ xử lý”.
4. Hệ thống thông báo đã nhận báo cáo.

**Thay thế / ngoại lệ:**

- **A1:** nhập thêm ghi chú tùy chọn → ghi chú gửi kèm báo cáo.
- **A2:** hủy → không tạo báo cáo.
- **E1:** chưa chọn lý do → báo lỗi, yêu cầu chọn.
- **E2:** đã báo cáo nội dung này rồi → thông báo, không tạo thêm.
- **E3:** nội dung đã bị gỡ/xóa → thông báo nội dung không còn tồn tại.

### 2.8. UC09 — Kiểm duyệt nội dung tự động

**Mục tiêu:** kiểm tra nội dung văn bản trước khi hiển thị, trả kết quả đạt/vi phạm cho use case gọi.  
**Tiền điều kiện:** được gọi từ UC03, UC05, UC07, UC12 (khi sửa) hoặc UC14 (khi sửa) với nội dung cần kiểm tra.  
**Hậu điều kiện thành công:** có kết quả đạt/vi phạm; nếu nội dung được lưu thì kết quả ghi vào Nhật ký kiểm duyệt.  
**Hậu điều kiện thất bại:** không có kết quả hợp lệ; lỗi được ghi log; nội dung bị từ chối; hệ thống báo đang bận.

**Luồng chính:**

1. Hệ thống nhận nội dung văn bản từ use case gọi.
2. Gửi nội dung tới model kiểm duyệt qua API.
3. Model trả nhãn đạt hoặc vi phạm.
4. Hệ thống trả kết quả về use case gọi.
5. Sau khi use case gọi lưu nội dung thành công, ghi kết quả vào Nhật ký kiểm duyệt, gắn với bài hoặc bình luận vừa lưu.

**Thay thế / ngoại lệ:**

- **A1:** model trả nhãn vi phạm → trả “vi phạm” kèm lý do để use case gọi từ chối ngay (BR8). Nội dung không lưu nên kết quả chỉ ghi log hệ thống, không ghi Nhật ký kiểm duyệt.
- **E1:** AI Service lỗi/timeout → ghi log, trả “không kiểm duyệt được”; use case gọi từ chối đăng/sửa và hiển thị “Hệ thống đang bận, vui lòng thử lại sau”.
- **E2:** model trả kết quả không hợp lệ → xử lý như E1.

### 2.9. UC10 — Xử lý báo cáo

**Mục tiêu:** Admin xem xét báo cáo và quyết định giữ hoặc gỡ nội dung.  
**Tiền điều kiện:** Admin đã đăng nhập và có ít nhất một báo cáo “chờ xử lý”.  
**Hậu điều kiện thành công:** báo cáo chuyển “đã xử lý” kèm quyết định; nếu vi phạm thì nội dung bị gỡ qua UC11.  
**Hậu điều kiện thất bại:** báo cáo vẫn “chờ xử lý”; nội dung giữ nguyên.

**Luồng chính:**

1. Admin mở danh sách báo cáo chờ xử lý.
2. Admin chọn một báo cáo.
3. Hệ thống hiển thị nội dung bị báo cáo, lý do, ghi chú, số lượng báo cáo của nội dung đó và kết quả kiểm duyệt AI (nếu có).
4. Admin đánh giá và chọn “Giữ bài”.
5. Hệ thống chuyển báo cáo sang “đã xử lý” và ghi lại quyết định.

**Thay thế / ngoại lệ:**

- **A1:** Admin kết luận vi phạm và chọn “Gỡ bài” → chuyển sang UC11, sau đó quay lại bước 5.
- **A2:** nội dung có nhiều báo cáo → hiển thị số lượng để cân nhắc (BR9); quyết định áp dụng cho tất cả báo cáo của nội dung đó.
- **E1:** nội dung đã bị người đăng xóa → thông báo, đóng báo cáo.
- **E2:** báo cáo đã được Admin khác xử lý → thông báo, quay về danh sách.
- **E3:** lỗi hệ thống khi lưu quyết định → báo lỗi, báo cáo giữ “chờ xử lý”.

### 2.10. UC11 — Gỡ nội dung vi phạm

**Mục tiêu:** Admin ẩn bài đăng hoặc bình luận đã kết luận vi phạm khỏi forum.  
**Tiền điều kiện:** đang xử lý báo cáo (UC10) và đã kết luận nội dung vi phạm.  
**Hậu điều kiện thành công:** nội dung bị gỡ khỏi forum; báo cáo “đã xử lý” kèm kết quả gỡ; quyết định được ghi lại.  
**Hậu điều kiện thất bại:** nội dung vẫn hiển thị; báo cáo vẫn “chờ xử lý”.

**Luồng chính:**

1. Admin chọn “Gỡ bài” trong màn hình xử lý báo cáo.
2. Hệ thống yêu cầu xác nhận và cho phép ghi lý do gỡ.
3. Admin xác nhận.
4. Hệ thống ẩn nội dung khỏi forum.
5. Cập nhật báo cáo sang “đã xử lý” và ghi lại quyết định.
6. Thông báo gỡ thành công.

**Thay thế / ngoại lệ:**

- **A1:** Admin hủy xác nhận → không gỡ, quay lại UC10.
- **E1:** nội dung đã bị người đăng xóa trước đó → thông báo, đóng báo cáo.
- **E2:** lỗi hệ thống → báo lỗi, nội dung và báo cáo giữ nguyên trạng thái cũ.

### 2.11. UC12 — Quản lý bài đăng của mình

**Mục tiêu:** chủ bài sửa hoặc xóa bài đăng của chính mình.  
**Tiền điều kiện:** đã xác thực, là người đăng bài, bài đang hiển thị.  
**Hậu điều kiện thành công:** sửa → bài cập nhật bản đã kiểm duyệt; xóa → bài bị xóa khỏi forum.  
**Hậu điều kiện thất bại:** bài giữ nguyên bản cũ.

**Luồng chính (sửa bài):**

1. Sinh viên mở bài của mình và chọn “Sửa”.
2. Hệ thống hiển thị form với nội dung hiện tại.
3. Sinh viên chỉnh sửa và gửi.
4. Hệ thống kiểm tra dữ liệu hợp lệ.
5. Hệ thống gọi UC09 để kiểm duyệt nội dung đã sửa.
6. UC09 trả kết quả đạt.
7. Hệ thống lưu, ghi Nhật ký kiểm duyệt và hiển thị bản đã sửa.

**Thay thế / ngoại lệ:**

- **A1:** chọn “Xóa” → yêu cầu xác nhận; xác nhận thì xóa bài và thông báo thành công.
- **A2:** hủy → giữ nguyên bài.
- **A3:** hủy xác nhận xóa → không xóa.
- **E1:** thiếu trường bắt buộc → báo lỗi, quay lại bước 2.
- **E2:** bản sửa bị đánh giá vi phạm → từ chối, giữ bản cũ, báo lý do (BR8).
- **E3:** AI Service lỗi/timeout → từ chối sửa, báo đang bận, giữ nội dung hiện tại.
- **E4:** không phải chủ bài → không hiển thị nút Sửa/Xóa; thao tác trực tiếp bị từ chối (BR10).
- **E5:** bài đã bị Admin gỡ → thông báo bài không còn tồn tại.

### 2.12. UC13 — Up/down vote bài review

**Mục tiêu:** sinh viên đánh giá bài review bằng up hoặc down vote.  
**Tiền điều kiện:** đã xác thực và đang xem một bài review.  
**Hậu điều kiện thành công:** vote được ghi nhận, điểm bài được cập nhật.  
**Hậu điều kiện thất bại:** vote và điểm không thay đổi.

**Luồng chính:**

1. Sinh viên chọn up (hoặc down) trên bài review.
2. Hệ thống kiểm tra sinh viên chưa vote bài này.
3. Hệ thống ghi nhận vote.
4. Hệ thống cập nhật và hiển thị điểm mới.

**Thay thế / ngoại lệ:**

- **A1:** đã vote cùng hướng → bỏ vote và cập nhật điểm.
- **A2:** đã vote khác hướng → đổi vote và cập nhật điểm.
- **E1:** tài khoản chưa xác thực → từ chối, chuyển sang UC02.
- **E2:** bài đã bị gỡ/xóa → thông báo, không ghi vote.
- **E3:** lỗi hệ thống khi lưu → báo lỗi, điểm giữ nguyên.

### 2.13. UC14 — Quản lý bình luận của mình

**Mục tiêu:** người viết sửa hoặc xóa bình luận của chính mình.  
**Tiền điều kiện:** đã xác thực, là người viết bình luận, bình luận đang hiển thị.  
**Hậu điều kiện thành công:** sửa → bình luận cập nhật bản đã kiểm duyệt; xóa → bình luận bị xóa khỏi bài.  
**Hậu điều kiện thất bại:** bình luận giữ nguyên bản cũ.

**Luồng chính (sửa bình luận):**

1. Sinh viên chọn “Sửa” trên bình luận của mình.
2. Hệ thống hiển thị nội dung hiện tại để chỉnh sửa.
3. Sinh viên chỉnh sửa và gửi.
4. Hệ thống kiểm tra nội dung không rỗng.
5. Hệ thống gọi UC09 để kiểm duyệt nội dung đã sửa.
6. UC09 trả kết quả đạt.
7. Hệ thống lưu, ghi Nhật ký kiểm duyệt và hiển thị bản đã sửa.

**Thay thế / ngoại lệ:**

- **A1:** chọn “Xóa” → yêu cầu xác nhận; xác nhận thì xóa bình luận.
- **A2:** hủy → giữ nguyên bình luận.
- **A3:** hủy xác nhận xóa → không xóa.
- **E1:** nội dung rỗng → không gửi, báo lỗi.
- **E2:** bản sửa vi phạm → từ chối, giữ bản cũ, báo lý do (BR8).
- **E3:** AI Service lỗi/timeout → từ chối sửa, báo đang bận, giữ nội dung hiện tại.
- **E4:** không phải chủ bình luận → không hiển thị nút Sửa/Xóa; thao tác trực tiếp bị từ chối (BR11).

---

## 3. Thiết kế UI

### 3.1. Ngôn ngữ thiết kế quan sát từ ảnh

- Nền sáng, tone kem/trắng ngà; card trắng bo góc lớn.
- Màu nhấn chính là xanh rêu đậm; CTA phụ màu cam đất; trạng thái vi phạm dùng đỏ.
- Typography sans-serif hiện đại; nhãn nhỏ in hoa, tiêu đề lớn, khoảng thở rộng.
- Header gồm logo “sivi.”, các mục “Tìm chỗ ở”, “Review địa điểm”, “Cá nhân” và khu vực tài khoản.
- Home page dùng hero lớn với thông điệp “Tìm chỗ ở tốt, gặp bạn cùng nhà hợp gu.” và CTA “Khám phá chỗ ở”.
- Modal xác thực, form đăng bài, form review, báo cáo đều dùng modal overlay tối.
- Badge/viên chip dùng cho loại bài, tiện ích, trạng thái AI.

> Ghi chú: ảnh trong PDF là mockup độ trung thực thấp, có dữ liệu placeholder. Chưa có design token chính thức (mã màu, font, spacing, breakpoint).

### 3.2. Danh mục màn hình

| Hình | Màn hình | Tệp |
|---|---|---|
| 2 | Đăng nhập – trang chủ, vai trò Khách | assets/figures/ui-01-home-guest.png |
| 3 | Modal nhập email trường | assets/figures/ui-02-email-modal.png |
| 4 | Modal nhập OTP 6 số | assets/figures/ui-03-otp-modal.png |
| 5 | Xác thực thành công, Badge Sinh viên | assets/figures/ui-04-verified.png |
| 6 | Forum Tìm Roommate | assets/figures/ui-05-roommate-forum.png |
| 7 | Chi tiết bài Tìm Roommate | assets/figures/ui-06-roommate-detail.png |
| 8 | Form đăng bài Roommate | assets/figures/ui-07-roommate-form.png |
| 9 | Forum Review Địa điểm | assets/figures/ui-08-review-forum.png |
| 10 | Form viết Review | assets/figures/ui-09-review-form.png |
| 11 | Chi tiết bài Review và vote | assets/figures/ui-10-review-detail.png |
| 12 | Bình luận và toast AI kiểm duyệt | assets/figures/ui-11-comments-ai.png |
| 13 | Modal báo cáo nội dung | assets/figures/ui-12-report-modal.png |
| 14 | Bài viết và bình luận của tôi | assets/figures/ui-13-my-content.png |
| 15 | Form chỉnh sửa bài đăng | assets/figures/ui-14-edit-post.png |
| 16 | Form chỉnh sửa bình luận | assets/figures/ui-15-edit-comment.png |
| 17 | Admin – quản trị báo cáo | assets/figures/ui-16-admin-reports.png |
| 18 | Admin – báo cáo đã xử lý | assets/figures/ui-17-admin-processed.png |

### 3.3. Màn hình tiêu biểu

Ảnh mockup được liệt kê ở mục 3.2 nhưng chưa được đưa vào repository.

### 3.4. Thành phần form

**Form đăng tin roommate:**

- Tiêu đề.
- Nội dung.
- Giá thuê mỗi tháng (đơn vị đồng).
- Số người cần tìm.
- Khu vực địa chỉ.
- Quận/huyện.
- Loại phòng (Ở ghép, Studio, ...).
- Ưu tiên giới tính (Không yêu cầu, Nam, Nữ, ...).
- Thông tin liên hệ (Zalo, Email hoặc Điện thoại).
- Tiện ích, phân tách bằng dấu phẩy.
- Ảnh (tùy chọn, theo UC03).

**Form viết review địa điểm:**

- Tiêu đề.
- Nội dung cảm nhận.
- Tên địa điểm.
- Địa chỉ địa điểm.
- Loại địa điểm (Cafe, Quán ăn, Photo, ...).
- Đánh giá bằng sao (1–5).
- Mức giá (dưới 50k, 50k–150k, trên 150k, ...).
- Loại không gian (Wifi, máy lạnh, ...).
- Tiện ích (chỗ đậu xe, ...).
- Ảnh (URL HTTPS, mỗi ảnh một dòng; không bắt buộc).

**Modal báo cáo:**

- Lý do (chọn từ danh sách: xúc phạm/quấy rối, spam, thông tin sai, ...).
- Ghi chú (không bắt buộc).
- Nút gửi báo cáo.

**Admin:**

- Nhãn AI (ví dụ “AI: Rủi ro”).
- Thông tin người báo cáo, thời gian, số lượng báo cáo.
- Nội dung bài/bình luận bị báo cáo.
- Lý do và ghi chú.
- Ô ghi chú xử lý nội bộ.
- Nút “Giữ bài” / “Gỡ bài”.
- Danh sách báo cáo đã xử lý, trạng thái Giữ/Gỡ.

---

## 4. Sequence diagram

### 4.1. UC02 — Xác thực OTP

Các nhánh chính trong diagram:

- Kiểm tra tên miền email và kiểm tra email đã gắn tài khoản khác.
- Sinh OTP, băm, lưu hạn 5 phút và gửi email.
- Gửi lại OTP: vô hiệu OTP cũ trước khi sinh OTP mới.
- OTP sai: tăng bộ đếm; quá 5 lần thì vô hiệu hóa.
- OTP hết hạn: yêu cầu gửi lại.
- Kiểm tra lại email trường trước khi gắn vào tài khoản (tránh race condition).

### 4.2. UC03/UC05 — Đăng bài kèm AI moderation

- Backend kiểm tra quyền xác thực trước khi nhận bài.
- Nếu thiếu/sai dữ liệu: trả lỗi, giữ nguyên nội dung trên form.
- Gọi AI Service; nếu lỗi/timeout: không lưu bài, báo hệ thống bận.
- Nếu AI trả vi phạm: từ chối, trả lý do, giữ form để sửa.
- Nếu đạt: lưu bài, ghi Nhật ký kiểm duyệt, hiển thị bài trên forum.

### 4.3. UC10 + UC11 — Xử lý báo cáo và gỡ bài

- Admin xem danh sách báo cáo trạng thái PENDING.
- Kiểm tra trạng thái báo cáo và trạng thái nội dung trước khi cho xử lý.
- Quyết định “Giữ bài”: báo cáo chuyển RESOLVED, decision KEEP.
- Quyết định “Gỡ bài”: xác nhận, ghi lý do, chạy transaction ẩn nội dung và cập nhật báo cáo RESOLVED, decision REMOVE.
- Nếu transaction lỗi: rollback, báo cáo và nội dung giữ nguyên trạng thái cũ.

---

## 5. Activity diagram

Các điểm nghiệp vụ cần giữ khi triển khai:

- OTP chỉ được dùng một lần; gửi lại phải vô hiệu OTP cũ.
- Mọi nhánh AI lỗi/timeout đều dẫn tới từ chối đăng, không được mặc định cho qua.
- Gỡ nội dung là thao tác nguyên tử cùng với cập nhật báo cáo.

---

## 6. Class diagram

### 6.1. Mô tả thực thể

| Thực thể | Mô tả |
|---|---|
| Người dùng | Tài khoản và hồ sơ: mã người dùng, email Google, email trường (có thể trống, không trùng), họ tên, mã số SV, liên hệ, vai trò, trạng thái xác thực, ngày tạo, thông tin OTP. |
| Yêu cầu xác thực | Theo dõi tiến trình xác minh: mã yêu cầu, trạng thái, ngày gửi, ngày xác thực. |
| Bài tìm roommate | Giá thuê, số chỗ cần tìm, giới tính ưu tiên, diện tích, yêu cầu với người ở cùng. |
| Bài review | Tên địa điểm, loại địa điểm, giá tham khảo, điểm đánh giá, trải nghiệm thực tế. |
| Bình luận | Mã bình luận, nội dung, ngày đăng, trạng thái. |
| Bình chọn | Hướng vote và thời điểm bình chọn. |
| Báo cáo | Mã báo cáo, lý do, mô tả, trạng thái, hình thức xử lý, ngày báo cáo, ngày xử lý. |
| Nhật ký kiểm duyệt | Mã nhật ký, loại nội dung, kết quả, nhóm vi phạm, độ tin cậy, thời điểm quét. |

### 6.2. Thuộc tính theo class diagram

| Lớp | Thuộc tính |
|---|---|
| Tên miền trường | Mã tên miền: int; Tên miền: string; Loại tên miền: enum |
| Trường | Mã trường: int; Tên trường: string; Tên viết tắt: string |
| Người dùng | Mã người dùng: int; Email Google: string; Email trường: string (UNIQUE, NULL); Họ tên: string; Mã số SV: string; Liên hệ: string; Vai trò: enum; Trạng thái xác thực: enum; Ngày tạo: datetime; Mã OTP (băm): string; Hạn OTP: datetime; Số lần thử OTP: int |
| Yêu cầu xác thực | Mã yêu cầu: int; Trạng thái: enum; Ngày gửi: datetime; Ngày xác thực: datetime |
| Quản trị viên | Cấp quản trị: enum; Ngày bổ nhiệm: date |
| Sinh viên | Ngành học: string; Khóa: string |
| Bài đăng | Mã bài: int; Loại bài: enum; Tiêu đề: string; Mô tả: text; Địa chỉ: string; Link Google Maps: string; Trạng thái: enum; Ngày đăng: datetime |
| Bài tìm roommate | Giá thuê: decimal; Số chỗ cần tìm: int; Giới tính ưu tiên: enum; Diện tích: float; Yêu cầu roommate: text |
| Bài review | Tên địa điểm: string; Loại địa điểm: enum; Giá tham khảo: decimal; Đánh giá: int; Trải nghiệm: text |
| Bình luận | Mã bình luận: int; Nội dung: text; Ngày đăng: datetime; Trạng thái: enum |
| Bình chọn | Hướng vote: enum; Thời điểm: datetime |
| Báo cáo | Mã báo cáo: int; Lý do: string; Mô tả: text; Trạng thái: enum; Hình thức xử lý: enum; Ngày báo cáo: datetime; Ngày xử lý: datetime |
| Nhật ký kiểm duyệt | Mã nhật ký: int; Loại nội dung: enum; Kết quả: string; Nhóm vi phạm: string; Độ tin cậy: float; Thời điểm quét: datetime |
| Ảnh bài đăng | Thứ tự: int; Đường dẫn ảnh: string; Ngày tải lên: datetime |

### 6.3. Quan hệ

- Người dùng 1–N Yêu cầu xác thực.
- Người dùng là lớp cha của Sinh viên và Quản trị viên.
- Sinh viên 1–N Bài đăng; Sinh viên 1–N Bình luận; Sinh viên 1–N Báo cáo; Sinh viên 1–N Bình chọn.
- Bài đăng là lớp cha của Bài tìm roommate và Bài review.
- Bài đăng 1–N Bình luận; Bài đăng 1–N Ảnh bài đăng.
- Bài review 1–N Bình chọn.
- Bài đăng/Bình luận 1–N Nhật ký kiểm duyệt.
- Báo cáo liên kết tới đúng một trong hai: Bài đăng hoặc Bình luận.
- Quản trị viên 1–N Báo cáo (xử lý).

---

## 7. Thiết kế cơ sở dữ liệu

### 7.1. EERD

### 7.2. Ánh xạ quan hệ

### 7.3. Lược đồ quan hệ

| Bảng | Cột | Khóa / ràng buộc |
|---|---|---|
| Trường | Mã trường, Tên trường, Tên viết tắt | PK: Mã trường |
| Tên miền trường | Mã tên miền, Mã trường, Tên miền, Loại tên miền | PK: Mã tên miền; FK: Mã trường |
| Người dùng | Mã người dùng, Mã trường, Email Google, Email trường, Họ tên, Mã số SV, Liên hệ, Vai trò, Trạng thái xác thực, Ngày tạo | PK: Mã người dùng; FK: Mã trường; UNIQUE: Email trường (cho phép NULL) |
| Quản trị viên | Mã người dùng, Cấp quản trị, Ngày bổ nhiệm | PK/FK: Mã người dùng |
| Sinh viên | Mã người dùng, Ngành học, Khóa | PK/FK: Mã người dùng |
| Yêu cầu xác thực | Mã yêu cầu, Mã người dùng, Email trường, Mã OTP (băm), Hạn OTP, Số lần thử OTP, Trạng thái, Ngày gửi, Ngày xác thực | PK: Mã yêu cầu; FK: Mã người dùng |
| Bài đăng | Mã bài, Mã SV đăng, Loại bài, Tiêu đề, Mô tả, Địa chỉ, Link Google Maps, Trạng thái, Ngày đăng | PK: Mã bài; FK: Mã SV đăng |
| Bài tìm roommate | Mã bài, Giá thuê, Số chỗ cần tìm, Giới tính ưu tiên, Diện tích, Yêu cầu roommate | PK/FK: Mã bài |
| Bài review | Mã bài, Tên địa điểm, Loại địa điểm, Giá tham khảo, Đánh giá, Trải nghiệm | PK/FK: Mã bài |
| Ảnh bài đăng | Mã bài, Thứ tự, Đường dẫn ảnh, Ngày tải lên | PK: (Mã bài, Thứ tự); FK: Mã bài |
| Bình luận | Mã bình luận, Mã bài, Mã SV, Nội dung, Ngày đăng, Trạng thái | PK: Mã bình luận; FK: Mã bài, Mã SV |
| Bình chọn | Mã SV, Mã bài, Hướng vote, Thời điểm | PK: (Mã SV, Mã bài); FK: Mã SV, Mã bài (bài review) |
| Báo cáo | Mã báo cáo, Mã bài, Mã bình luận, Mã SV báo cáo, Mã QTV xử lý, Lý do, Mô tả, Trạng thái, Hình thức xử lý, Ngày báo cáo, Ngày xử lý | PK: Mã báo cáo; FK: Mã bài (NULL), Mã bình luận (NULL), Mã SV báo cáo, Mã QTV xử lý; CHECK đúng một trong Mã bài/Mã bình luận; UNIQUE (Mã SV báo cáo, Mã bài); UNIQUE (Mã SV báo cáo, Mã bình luận) |
| Nhật ký kiểm duyệt | Mã nhật ký, Mã bài, Mã bình luận, Loại nội dung, Kết quả, Nhóm vi phạm, Độ tin cậy, Thời điểm quét | PK: Mã nhật ký; FK: Mã bài (NULL), Mã bình luận (NULL); CHECK đúng một trong Mã bài/Mã bình luận |

### 7.4. Ghi chú thiết kế dữ liệu

- Báo cáo và Nhật ký kiểm duyệt dùng quan hệ **đa hình** bằng hai cột nullable và CHECK constraint, không dùng bảng trung gian riêng.
- Bình chọn dùng khóa chính kép (Mã SV, Mã bài), bảo đảm mỗi sinh viên chỉ có một vote trên mỗi bài review.
- Email trường có UNIQUE nhưng cho phép NULL, phục vụ tài khoản Google chưa xác thực.
- Class diagram đặt các trường OTP trong Người dùng; bản ánh xạ DB đặt chúng trong Yêu cầu xác thực. Khi triển khai nên theo bản ánh xạ DB và coi Yêu cầu xác thực là nguồn dữ liệu OTP.

---

## 8. AI Content Moderation

### 8.1. Phạm vi và mục tiêu

Module AI Moderation là dịch vụ độc lập nằm giữa thao tác tạo bài của sinh viên và bước công khai nội dung. Mục tiêu:

- Rút ngắn thời gian duyệt bài hợp lệ.
- Phát hiện sớm nội dung có nguy cơ vi phạm.
- Tự động gán tag phân loại bài viết.
- Lưu kết quả có thể giải thích cho người dùng và Admin.

### 8.2. Đầu vào – đầu ra

| Thành phần | Mô tả |
|---|---|
| Đầu vào MVP | Văn bản sẽ hiển thị: tiêu đề, nội dung, địa chỉ, tiện ích và thông tin liên hệ. Ảnh không được OCR hay gửi cho AI. |
| Đầu ra AI | Tags và điểm tin cậy/xác suất; không sinh đoạn văn tự do. |
| Đầu ra nghiệp vụ | PASS hoặc REJECT. `needs_review` là cờ kiểm tra Admin, không phải trạng thái bài. |
| Giới hạn | Không thay thế luật nội quy, bộ lọc tải tệp, phân quyền hoặc quy trình khiếu nại. |

**Yêu cầu chức năng:**

- Chỉ kiểm duyệt đồng bộ text bài đăng và bình luận; sửa nội dung thì kiểm duyệt lại.
- Chỉ nội dung bạo lực hoặc tình dục vượt ngưỡng mới bị REJECT.
- Điểm trung gian và ragebait được PASS, lưu `needs_review=true` trong `moderation_logs` để Admin xem.
- AI lỗi, timeout hoặc trả sai cấu trúc thì fail closed: không lưu nội dung.
- Không có queue, worker, OCR/ASR, retry pipeline hoặc trạng thái chờ duyệt trong MVP.

### 8.3. Luồng MVP

1. Next.js xác thực quyền và kiểm tra input bằng Zod.
2. Service gửi text tới AI FastAPI đồng bộ với timeout.
3. Policy trong Next.js trả PASS hoặc REJECT; điểm trung gian/ragebait chỉ bật cờ `needs_review`.
4. Chỉ khi PASS, transaction lưu nội dung và moderation log append-only.
5. Nếu AI lỗi/timeout/response sai cấu trúc, không lưu nội dung và báo lỗi cho người dùng.

### 8.4. Vì sao dùng Laya thay vì LLM sinh văn bản

| Tiêu chí | Laya Multilingual | LLM sinh văn bản |
|---|---|---|
| Hình thức đầu ra | Tag/giá trị xác suất có cấu trúc | Thường cần ràng buộc hoặc parse đầu ra |
| Độ trễ | Không có vòng lặp sinh token; thuận lợi cho batch | Phụ thuộc số token sinh và cấu hình model |
| Phần cứng | Encoder 322M tham số; chạy được CPU/GPU | Rất đa dạng theo kích thước model |
| Khả năng xử lý | Phù hợp câu hỏi đóng, schema ổn định | Linh hoạt hơn với ngữ cảnh mở/đa phương thức |
| Rủi ro | Sai nhãn, lệch xác suất, bỏ sót ngữ cảnh dài | Sai kết luận, chi phí/độ trễ biến thiên |

Thông số tham khảo:

- Checkpoint laya-multilingual; mmBERT-base; khoảng 322 triệu tham số; hơn 100 ngôn ngữ.
- Context mặc định 1.024 token cho câu hỏi + nội dung.
- Trọng số khoảng 644–647 MB (bf16/fp16); RAM/VRAM thực tế lớn hơn do activation và runtime.
- Tốc độ công bố trên T4: 32,8 ms cho 1 câu hỏi; 72,3 ms cho 10 câu hỏi của multilingual. Đây không phải độ trễ end-to-end.
- SDK có predict_batch; API /v1/systemone/batch giới hạn 64 states/request; batch nội bộ phải giới hạn theo memory.
- Các tuyên bố “500 MB VRAM”, “512 bài/forward”, “nhanh hơn LLM 60–100 lần” chưa phải cam kết từ tài liệu nguồn.

### 8.5. Bộ tag và chính sách

| Tag | Loại | Diễn giải và hành động gợi ý |
|---|---|---|
| violence | Rủi ro | Đe dọa, cổ súy bạo lực, mô tả bạo lực đồ họa; không tự động đánh đồng bản tin học thuật hoặc thảo luận phê bình. |
| sex | Rủi ro | Nội dung tình dục phản cảm/vi phạm nội quy; phân biệt bài học sức khỏe sinh sản với nội dung cần chặn. |
| ragebait | Rủi ro/chất lượng | Kích động tranh cãi, cố ý công kích để câu tương tác; giai đoạn đầu ưu tiên chuyển duyệt thủ công. |
| review | Chủ đề | Bài đánh giá trải nghiệm trường, môn học, sản phẩm, dịch vụ; được phép xuất hiện cùng ask. |
| ask | Chủ đề | Bài đặt câu hỏi/tìm kiếm trợ giúp; không quyết định mức độ an toàn. |

Hai lớp quyết định tách biệt:

1. **Semantic tagging:** gắn nhãn review, ask (có thể bổ sung event, discussion, marketplace...). Đây là nhãn điều hướng, không phải điều kiện cấm.
2. **Safety moderation:** gắn nhãn violence, sex, ragebait theo định nghĩa chính sách. Policy engine, không phải model, quyết định trạng thái bài dựa trên xác suất và độ nghiêm trọng.

### 8.6. Ma trận quyết định

| Điều kiện | Trạng thái | Phản hồi |
|---|---|---|
| Bạo lực/tình dục vượt ngưỡng | REJECT | Từ chối, không lưu nội dung. |
| Điểm trung gian hoặc ragebait | PASS + `needs_review=true` | Đăng ACTIVE; Admin có thể xem log flagged. |
| Không có rủi ro vượt ngưỡng | PASS | Đăng ACTIVE. |
| AI lỗi, timeout hoặc response không hợp lệ | Lỗi hệ thống | Fail closed; không lưu nội dung. |

Ngưỡng chính xác phải được kiểm thử trên model và bộ dữ liệu của nhóm; không coi các ngưỡng minh họa trong nghiên cứu là giá trị production.

### 8.7. Data contract

Input gửi Laya chỉ chứa text bài đăng/bình luận; định nghĩa nhãn do server kiểm soát. Coi mọi nội dung người dùng là dữ liệu không đáng tin cậy.

**Payload phân loại:**

~~~json
{
  "state": {
    "title": "Review thư viện trường",
    "body": "Mình đánh giá phòng đọc khá tốt. Ai biết giờ mở cửa?",
    "attachment_text": ""
  },
  "questions": {
    "violence": {
      "type": "choice",
      "instructions": "Evaluate violence policy.",
      "criteria": {
        "A": "contains prohibited violent threats or graphic violence",
        "B": "does not contain prohibited violent content"
      }
    },
    "review": {
      "type": "choice",
      "instructions": "Identify review topic.",
      "criteria": {
        "A": "a first-hand evaluation or review",
        "B": "not a review"
      }
    }
  },
  "model": "multilingual"
}
~~~

Trong triển khai, thêm trường sex và ragebait theo schema của Laya. Tag review/ask chỉ cần khi giao diện sản phẩm cần; không dùng tag chủ đề làm điều kiện cho phép đăng. Phía ứng dụng ánh xạ xác suất theo đúng response schema của model, không giả định option A luôn là kết quả đúng.

**Kết quả chuẩn hóa cho backend:**

~~~json
{
  "post_id": "P00152",
  "result": "approved",
  "tags": ["review", "ask"],
  "risk_scores": {
    "violence": 0.02,
    "sex": 0.01,
    "ragebait": 0.06
  },
  "reason_codes": [],
  "policy_version": "moderation-v1",
  "model_version": "laya-multilingual-pinned-revision",
  "needs_review": true
}
~~~

### 8.8. Triển khai và hiệu năng

- Gọi AI đồng bộ; đặt timeout ở Next.js. Không lưu nháp hoặc trả thành công khi chưa có kết quả kiểm duyệt hợp lệ.
- Lỗi/timeout/response sai schema: trả lỗi, không lưu nội dung (fail closed).
- Demo local dùng Docker Compose cho AI và PostgreSQL; Next.js chạy trên máy host.
- Chưa cần benchmark tải, queue, retry pipeline, VPS hay nhiều worker cho đồ án.

---

## 9. Quyết định đã thống nhất cho MVP

1. OTP lưu ở `verification_requests`; không lưu lặp các trường OTP trong user.
2. Trạng thái bài chỉ `ACTIVE` hoặc `HIDDEN`; `REJECTED` không phải trạng thái bài.
3. AI chạy đồng bộ, fail closed; quyết định nội dung chỉ PASS hoặc REJECT. Mức trung gian/ragebait là cờ `needs_review` trong moderation log.
4. AI chỉ đọc văn bản. Ảnh là tùy chọn, lưu local và được xác thực/resize bằng `sharp`; không OCR hay quét ảnh bằng AI.
5. Vote chỉ áp dụng cho bài review.
6. Đọc dữ liệu bằng Server Components/service; không tạo REST API đọc, repository riêng, notifications hoặc `post_tags`.
7. Không làm queue/worker, S3/MinIO hoặc VPS cho demo. Next.js chạy trên máy host; Compose chạy PostgreSQL và AI.
8. Giới hạn validation MVP: title 1–120 ký tự, body 1–5000, comment 1–2000, tối đa 5 ảnh/bài, 5 MB/ảnh, JPEG/PNG/WebP.
9. Admin xử lý báo cáo; chủ bài xem bài HIDDEN trong “Bài của tôi” với nhãn “đã bị gỡ”, không cần notification.
10. UC07 bình luận thuộc P1 và cần ưu tiên vì yêu cầu môn học; nếu thiếu thời gian, cắt P2 trước.

---

## 10. Tài liệu tham khảo

1. NandhaKishorM, **Laya: README và HTTP/Batch API** — https://github.com/NandhaKishorM/laya
2. NandhaKishorM, **Laya Benchmarks** — https://github.com/NandhaKishorM/laya/blob/main/BENCHMARKS.md
3. Convai Innovations, **Laya Multilingual Model Card** — https://huggingface.co/convaiinnovations/laya-multilingual
4. Microsoft, **MarkItDown: README và các định dạng hỗ trợ** — https://github.com/microsoft/markitdown
5. Microsoft, **MarkItDown: Security Considerations** — https://github.com/microsoft/markitdown#security-considerations
6. Convai Innovations, **Laya: thông tin kỹ thuật mô hình** — https://laya.convaiinnovations.com/
