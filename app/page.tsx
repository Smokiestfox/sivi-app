import ForumFeed from '@/components/ForumFeed';
import PostCount from '@/components/PostCount';
import SiteHeader from '@/components/SiteHeader';
import { UNIVERSITIES } from '@/types';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#18352d]">
      <SiteHeader />

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="mb-5 inline-flex rounded-full bg-[#e6f3ec] px-4 py-2 text-sm font-semibold text-[#187b5b]">
            Cộng đồng sống và học tập của sinh viên
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Tìm chỗ ở tốt,
            <span className="block text-[#187b5b]">gặp bạn cùng nhà hợp gu.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#64766e] sm:text-lg">
            Khám phá tin tìm bạn ở ghép và phòng cho thuê quanh các trường đại học tại TP.HCM.
          </p>
          <a
            href="#posts"
            className="mt-8 inline-flex rounded-full bg-[#f4a340] px-6 py-3.5 font-bold text-[#2c332b] transition hover:bg-[#ec9630]"
          >
            Khám phá chỗ ở <span aria-hidden="true" className="ml-2">→</span>
          </a>
        </div>

        <div className="rounded-[2rem] bg-[#dff0e6] p-6 sm:p-9">
          <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#819188]">
              Bắt đầu từ đây
            </p>
            <h2 className="mt-3 text-2xl font-bold">Một nơi ở phù hợp tạo nên nhiều điều vui.</h2>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#f7f8f5] p-4">
                <p className="text-2xl font-bold text-[#187b5b]"><PostCount /></p>
                <p className="mt-1 text-sm text-[#64766e]">tin đang hoạt động</p>
              </div>
              <div className="rounded-2xl bg-[#f7f8f5] p-4">
                <p className="text-2xl font-bold text-[#187b5b]">{UNIVERSITIES.length}</p>
                <p className="mt-1 text-sm text-[#64766e]">trường trong cộng đồng</p>
              </div>
            </div>
            <p className="mt-6 border-t border-[#e9ede8] pt-5 text-sm leading-6 text-[#64766e]">
              Tin đang chờ duyệt sẽ không hiển thị công khai cho đến khi được xác nhận.
            </p>
          </div>
        </div>
      </section>

      <section id="universities" className="border-y border-[#e5e9e2] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8">
          <p className="mb-4 text-sm font-semibold text-[#64766e]">Cộng đồng sinh viên</p>
          <ul className="flex flex-wrap gap-2.5">
            {UNIVERSITIES.map((university) => (
              <li
                key={university.id}
                className="rounded-full border border-[#e5e9e2] px-4 py-2 text-sm font-medium text-[#456057]"
              >
                {university.name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="posts" className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-18">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#187b5b]">
              Cập nhật mới
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Chỗ ở đang tìm bạn
            </h2>
          </div>
          <p className="text-sm text-[#64766e]">Tìm chỗ ở phù hợp với bạn</p>
        </div>

        <ForumFeed type="roommate" />
      </section>

      <footer className="border-t border-[#e5e9e2] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-sm text-[#819188] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="font-bold text-[#187b5b]">sivi.</p>
          <p>Cùng sinh viên tìm nơi ở phù hợp.</p>
        </div>
      </footer>
    </main>
  );
}
