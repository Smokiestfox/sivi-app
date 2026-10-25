'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PostForm from '@/components/PostForm';
import { notify } from '@/components/feedback';
import { useSession } from '@/components/useSession';
import type { Post, PostType } from '@/types';

async function fetchPosts(type: PostType): Promise<Post[]> {
  const response = await fetch(`/api/posts?type=${type}`, { cache: 'no-store' });
  const result = (await response.json()) as { posts?: Post[]; error?: string };
  if (!response.ok) throw new Error(result.error || 'Không tải được danh sách bài viết.');
  return result.posts ?? [];
}

export default function ForumFeed({ type }: { type: PostType }) {
  const { user } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [maximumPrice, setMaximumPrice] = useState('');

  const refresh = useCallback(async () => {
    try {
      setPosts(await fetchPosts(type));
      setError('');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không thể kết nối máy chủ.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    let active = true;
    fetchPosts(type)
      .then((items) => {
        if (active) {
          setPosts(items);
          setError('');
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Không thể kết nối máy chủ.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [type]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('vi');
    return posts.filter((post) => {
      const haystack = [
        post.title, post.content,
        post.type === 'roommate' ? `${post.area} ${post.district}` : `${post.placeName} ${post.placeAddress}`,
      ].join(' ').toLocaleLowerCase('vi');
      const matchesText = !needle || haystack.includes(needle);
      const matchesDistrict =
        !district || (post.type === 'roommate' && post.district === district);
      const matchesPrice =
        !maximumPrice || (post.type === 'roommate' && post.price <= Number(maximumPrice));
      return matchesText && matchesDistrict && matchesPrice;
    });
  }, [posts, search, district, maximumPrice]);

  const districts = [...new Set(posts.flatMap((post) => post.type === 'roommate' ? [post.district] : []))];
  const isStudent = user?.is_verified;
  const createPost = () => {
    if (isStudent) setFormOpen(true);
    else notify(user ? 'Hãy xác thực email sinh viên trước khi đăng bài.' : 'Đăng nhập và xác thực sinh viên để đăng bài.', 'info');
  };

  return (
    <>
      <div className="mb-6 rounded-2xl border border-[#e5e9e2] bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <label className="sr-only" htmlFor={`search-${type}`}>Tìm kiếm bài viết</label>
          <input id={`search-${type}`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tiêu đề, nội dung, địa điểm..." className="rounded-xl border border-[#dce4dd] px-4 py-3 text-sm outline-none focus:border-[#187b5b]" />
          {type === 'roommate' && (
            <>
              <label className="sr-only" htmlFor="district-filter">Lọc theo quận</label>
              <select id="district-filter" value={district} onChange={(event) => setDistrict(event.target.value)} className="rounded-xl border border-[#dce4dd] px-4 py-3 text-sm">
                <option value="">Tất cả khu vực</option>
                {districts.map((item) => <option key={item}>{item}</option>)}
              </select>
              <label className="sr-only" htmlFor="max-price">Giá tối đa</label>
              <input id="max-price" type="number" min="0" value={maximumPrice} onChange={(event) => setMaximumPrice(event.target.value)} placeholder="Giá tối đa (₫)" className="rounded-xl border border-[#dce4dd] px-4 py-3 text-sm" />
            </>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#64766e]">{loading ? 'Đang tải...' : `${filtered.length} bài viết`}</p>
          <button onClick={createPost} className="rounded-full bg-[#187b5b] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#12664a]">
            {type === 'roommate' ? '+ Đăng tin tìm roommate' : '+ Viết review'}
          </button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-700">
          {error} <button onClick={() => void refresh()} className="ml-2 font-semibold underline">Thử lại</button>
        </div>
      ) : loading ? (
        <div className="rounded-2xl bg-white p-10 text-center text-[#64766e]">Đang tải bài viết...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#e5e9e2] bg-white p-10 text-center">
          <h3 className="text-lg font-bold">Chưa có bài viết phù hợp</h3>
          <p className="mt-2 text-sm text-[#64766e]">Thử điều chỉnh bộ lọc hoặc đăng bài đầu tiên nhé.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map((post) => (
            <article key={post.id} className="overflow-hidden rounded-3xl border border-[#e5e9e2] bg-white shadow-[0_8px_30px_rgba(24,53,45,0.04)]">
              {post.images[0] && (
                <div className="h-48 bg-cover bg-center" role="img" aria-label={`Ảnh: ${post.title}`} style={{ backgroundImage: `url("${post.images[0].replaceAll('"', '%22')}")` }} />
              )}
              <div className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-[#e6f3ec] px-3 py-1.5 text-xs font-bold text-[#187b5b]">
                    {post.type === 'roommate'
                      ? ({ private: 'Phòng riêng', shared: 'Ở ghép', studio: 'Studio' } as const)[post.roomType]
                      : 'Review địa điểm'}
                  </span>
                  <span className="text-sm font-semibold text-[#64766e]">
                    {post.type === 'roommate' ? post.district : `★ ${post.rating}/5`}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-bold leading-snug">{post.title}</h3>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#64766e]">{post.content}</p>
                <div className="mt-5 flex items-baseline gap-2">
                  {post.type === 'roommate' ? (
                    <>
                      <span className="text-2xl font-bold text-[#187b5b]">{post.price.toLocaleString('vi-VN')} ₫</span>
                      <span className="text-sm text-[#819188]">/ tháng · tìm {post.peopleNeeded} người</span>
                    </>
                  ) : <span className="font-bold text-[#187b5b]">{post.placeName}</span>}
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-[#edf0eb] pt-4">
                  {post.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-[#f7f8f5] px-3 py-1.5 text-xs text-[#64766e]">{tag}</span>)}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-[#64766e]">
                  <span>{post.type === 'roommate' ? post.area : post.placeAddress}</span>
                  <span>{post.commentCount} bình luận</span>
                </div>
                <Link href={`/posts/${post.id}`} className="mt-5 inline-flex font-bold text-[#187b5b] hover:underline">
                  Xem chi tiết <span aria-hidden="true" className="ml-1">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      {formOpen && <PostForm type={type} onClose={() => setFormOpen(false)} onSaved={() => void refresh()} />}
    </>
  );
}
