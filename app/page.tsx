const docs = ["Kiến trúc", "Data model", "Diagram"];

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">SiVi skeleton</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">Nền tảng đã sẵn sàng để phát triển.</h1>
      <p className="mt-4 max-w-2xl text-slate-600">
        Đây là skeleton kiến trúc v3: Next.js full-stack, PostgreSQL, Drizzle ORM và Python AI service.
        UI từ branch an sẽ được port dần vào components/.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        {docs.map((label) => (
          <span key={label} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            {label}
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm text-slate-500">Tài liệu nằm trong thư mục docs/ của repo.</p>
      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Bước tiếp theo</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Chạy PostgreSQL bằng docker compose.</li>
          <li>Generate và migrate schema Drizzle.</li>
          <li>Port UI từ sivi-app/components.</li>
          <li>Nối auth, upload và AI service.</li>
        </ol>
      </div>
    </main>
  );
}
