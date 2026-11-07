# Bộ architecture diagram dễ đọc cho SiVi

**Mục tiêu:** chọn ít diagram nhưng mỗi cái trả lời đúng một câu hỏi, dễ review trong PR và dễ trình bày với giảng viên.

## 1. Bộ diagram

| Ưu tiên | Diagram                           | Trả lời câu hỏi                            | Đối tượng              |
| --------: | --------------------------------- | ---------------------------------------------- | -------------------------- |
|         1 | System Context                    | Ai dùng, hệ thống nối với dịch vụ nào? | Giảng viên, người mới |
|         2 | Container                         | Có những runtime/container nào?             | Cả nhóm                  |
|         3 | Component                         | Bên trong Next.js có module gì?             | Dev                        |
|         4 | ERD core                          | Dữ liệu chính liên kết thế nào?         | Dev, DB                    |
|         5 | Sequence: đăng bài + AI        | Một bài đi qua những bước nào?          | Dev, QA                    |
|         6 | Sequence: admin xử lý báo cáo | Gỡ bài/bình luận diễn ra thế nào?       | Dev, Admin                 |
|         7 | Deployment                        | Chạy ở đâu, container nào?                | Infra, báo cáo           |
|         8 | State: bài đăng                | Trạng thái bài thay đổi ra sao?           | Dev, QA                    |

Không nên vẽ một ERD 20 bảng thật to rồi cố nhồi mọi thứ vào. Hãy tách:

- ERD lõi forum: users, posts, roommate_posts, review_posts, comments, votes.
- ERD auth/trường: universities, university_domains, users, verification_requests, sessions.
- ERD kiểm duyệt/báo cáo: reports, moderation_logs.

## 2. System Context

Dùng khi giới thiệu tổng quan, không đi vào công nghệ.

```mermaid
flowchart LR
    SV["Sinh viên"] -->|HTTPS| SIVI["SiVi"]
    ADMIN["Quản trị viên"] -->|HTTPS| SIVI

    SIVI -->|OAuth 2.0| GOOGLE["Google OAuth"]
    SIVI -->|SMTP| MAIL["Email trường"]
    SIVI -->|HTTP| AI["AI moderation service"]
    SIVI -->|SQL| DB[("PostgreSQL")]
```

**Cách đọc:** người dùng đi vào SiVi; SiVi phụ thuộc Google, email, AI và database.

## 3. Container

Đây là diagram quan trọng nhất, dùng làm “một trang kiến trúc”.

```mermaid
flowchart TB
    subgraph CLIENT["Trình duyệt"]
        UI["Next.js UI<br/>React + Ant Design"]
    end

    subgraph APP["Next.js app"]
        PAGE["Server Components"]
        ROUTES["Route handlers<br/>ghi, OAuth callback, upload"]
        SERVICE["server/ services<br/>Drizzle + nghiệp vụ"]
    end

    DB[("PostgreSQL")]
    STORAGE[("storage/<br/>ảnh local")]
    AI["Python FastAPI<br/>Laya"]
    GOOGLE["Google OAuth"]
    SMTP["SMTP"]

    UI --> PAGE
    UI -->|mutations| ROUTES
    PAGE --> SERVICE
    ROUTES --> SERVICE
    SERVICE -->|SQL| DB
    SERVICE -->|file system| STORAGE
    SERVICE -->|HTTP| AI
    SERVICE -->|OAuth| GOOGLE
    SERVICE -->|SMTP| SMTP
```

**Cách đọc:** trang đọc qua Server Components và service; route handlers chỉ phục vụ ghi, OAuth, upload.

## 4. Component trong Next.js

Dùng khi chia việc hoặc review code.

```mermaid
flowchart LR
    APP["Server Components + route handlers"]

    subgraph DOMAIN["Module services"]
        AUTH["Auth + OTP"]
        POSTS["Posts"]
        COMMENTS["Comments"]
        VOTES["Votes"]
        REPORTS["Reports + Admin"]
        UPLOADS["Uploads"]
        MOD["Moderation"]
    end

    subgraph INFRA["Infrastructure"]
        DB[("PostgreSQL")]
        STORAGE[("Storage")]
        AI["AI service"]
        MAIL["SMTP"]
    end

    APP --> AUTH
    APP --> POSTS
    APP --> COMMENTS
    APP --> VOTES
    APP --> REPORTS
    APP --> UPLOADS
    APP --> MOD

    AUTH --> DB
    AUTH --> MAIL
    POSTS --> DB
    COMMENTS --> DB
    VOTES --> DB
    REPORTS --> DB
    UPLOADS --> STORAGE
    UPLOADS --> DB
    MOD --> AI
    MOD --> DB
```

**Cách đọc:** controller chỉ điều phối; service chứa nghiệp vụ; infra là DB, storage, AI, mail.

## 5. ERD lõi forum

Chỉ vẽ phần lõi trước; các bảng auth để diagram riêng.

```mermaid
erDiagram
    users ||--o{ posts : writes
    posts ||--o| roommate_posts : roommate
    posts ||--o| review_posts : review
    posts ||--o{ comments : has
    users ||--o{ comments : writes
    posts ||--o{ votes : receives
    users ||--o{ votes : casts
    posts ||--o{ post_images : has
```

**Cách đọc:** một user viết nhiều bài; mỗi bài là roommate hoặc review; bài có comment, vote và ảnh.

## 6. Sequence: đăng bài kèm AI

```mermaid
sequenceDiagram
    actor SV as Sinh viên
    participant UI as Next.js UI
    participant APP as Next.js
    participant MOD as Moderation service
    participant AI as Python AI
    participant DB as PostgreSQL

    SV->>UI: Chọn ảnh và nhập bài
    UI->>APP: Gửi nội dung và ảnh
    APP->>APP: Kiểm tra quyền, Zod và ảnh bằng sharp
    APP->>MOD: Kiểm duyệt toàn bộ văn bản
    MOD->>AI: Gửi văn bản cần kiểm duyệt

    alt AI lỗi hoặc timeout
        AI-->>MOD: Lỗi hoặc hết thời gian chờ
        MOD-->>APP: Không có kết quả hợp lệ
        APP-->>UI: Báo lỗi, không lưu bài
    else AI trả kết quả
        AI-->>MOD: Tags và điểm
        MOD-->>APP: Kết quả kiểm duyệt
        alt Nội dung đạt
            APP->>DB: Lưu bài ACTIVE, ảnh và moderation_log
            DB-->>APP: Đã lưu
            APP-->>UI: Thành công, làm mới trang
        else Nội dung vi phạm
            APP-->>UI: Báo vi phạm, không lưu bài
        end
    end
```

**Cách đọc:** ảnh đi cùng thao tác tạo bài; chỉ nội dung được chấp nhận mới tạo bài; lỗi AI thì fail closed.

## 7. Sequence: admin xử lý báo cáo

```mermaid
sequenceDiagram
    actor AD as Admin
    participant UI as Admin Dashboard
    participant SERVER as Next.js service
    participant DB as PostgreSQL

    AD->>UI: Mở báo cáo pending
    UI->>SERVER: đọc báo cáo
    SERVER->>DB: select pending + target
    SERVER-->>UI: danh sách báo cáo

    AD->>UI: Chọn Gỡ bài
    UI->>SERVER: xử lý báo cáo
    SERVER->>DB: BEGIN, lock report + target
    SERVER->>DB: update target hidden + reports
    SERVER->>DB: COMMIT
    SERVER-->>UI: cập nhật xong, router.refresh()
```

**Cách đọc:** một quyết định áp dụng cho toàn bộ báo cáo của cùng nội dung, không chỉ báo cáo đang chọn.

## 8. Deployment

```mermaid
flowchart TB
    USER["Trình duyệt"] -->|localhost:3000| WEB["Next.js trên máy host"]
    WEB -->|5432| DB[("PostgreSQL trong Compose")]
    WEB -->|8100| AI["FastAPI trong Compose"]
    WEB -->|đọc/ghi file| STORAGE[("storage/ trên host")]
    AI --> MODEL[("Model files")]
```

**Cách đọc:** Compose chỉ chạy PostgreSQL và AI; Next.js chạy trực tiếp trên máy phát triển.

## 9. State: bài đăng

```mermaid
stateDiagram-v2
    [*] --> ACTIVE: AI pass
    ACTIVE --> HIDDEN: Admin gỡ
    HIDDEN --> [*]
```

## 10. Công cụ

| Mục đích                | Công cụ                 | Lý do                                                |
| -------------------------- | ------------------------- | ----------------------------------------------------- |
| Lưu trong repo, review PR | Mermaid                   | Render trực tiếp trên GitHub, sửa bằng text      |
| ERD chi tiết              | DBML + dbdiagram.io       | Dễ đọc, export PNG/SVG                             |
| Báo cáo đẹp            | draw.io / diagrams.net    | Chỉnh layout, màu, export                           |
| Thảo luận nhanh          | Excalidraw                | Vẽ tay, không cần chuẩn                           |
| C4 chuyên sâu            | Structurizr / C4-PlantUML | Khi cần nhiều level; hơi nặng cho nhóm 5 người |

## 11. Nguyên tắc để diagram dễ đọc

1. Mỗi diagram chỉ trả lời một câu hỏi.
2. Tối đa 7–9 box chính; chi tiết đẩy xuống diagram khác.
3. Ghi rõ protocol khi cần.
4. Dùng cùng một tên cho module trong code và diagram.
5. Đừng trộn deployment với business flow.
6. ERD lớn phải tách theo domain.
7. Màu chỉ để phân nhóm, không dùng quá 3 màu.
8. Diagram trong repo dùng Mermaid/DBML; PNG chỉ để xuất báo cáo.

## 12. Bộ tối thiểu để trao đổi

Nếu chỉ có 30 phút để trình bày, dùng 4 cái:

1. Container.
2. ERD lõi forum.
3. Sequence đăng bài + AI.
4. Sequence admin xử lý báo cáo.

Context dùng để mở đầu; Component và Deployment để trả lời câu hỏi kỹ thuật.
