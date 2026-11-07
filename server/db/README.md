# server/db

- schema.ts: nguồn sự thật cho 14 bảng cốt lõi và bảng `sessions`.
- client.ts: pool PostgreSQL + Drizzle client.
- migrations/: do drizzle-kit generate sinh ra; không sửa tay nếu không cần.

Lệnh:

~~~bash
npm run db:generate
npm run db:migrate
npm run db:studio
~~~
