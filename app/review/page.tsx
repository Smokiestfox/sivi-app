import ForumFeed from '@/components/ForumFeed';
import SiteHeader from '@/components/SiteHeader';

export default function ReviewPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#18352d]">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#187b5b]">Cộng đồng SiVi</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Review địa điểm</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#64766e]">Khám phá quán ăn, cafe và những địa điểm được sinh viên chia sẻ.</p>
          </div>
        </div>
        <div className="mt-8"><ForumFeed type="review" /></div>
      </section>
    </main>
  );
}
