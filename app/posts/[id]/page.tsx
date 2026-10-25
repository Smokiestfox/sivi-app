import { Suspense } from 'react';
import PostDetail from '@/components/PostDetail';
import SiteHeader from '@/components/SiteHeader';

async function PostContent({ params }: PageProps<'/posts/[id]'>) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-6xl pt-8"><PostDetail id={id} /></div>
  );
}

export default function PostPage(props: PageProps<'/posts/[id]'>) {
  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 pb-14 text-[#18352d] sm:px-8">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-6xl pt-8 text-[#64766e]">Đang tải bài viết...</div>}>
        <PostContent {...props} />
      </Suspense>
    </main>
  );
}
