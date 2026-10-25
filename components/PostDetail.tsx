'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import PostForm from '@/components/PostForm';
import ReportForm from '@/components/ReportForm';
import { notify } from '@/components/feedback';
import { useSession } from '@/components/useSession';
import type { Comment, Post } from '@/types';

interface PublicComment extends Comment {
  author: string;
  avatar: string | null;
}

async function fetchPostData(id: string): Promise<{ post: Post; comments: PublicComment[] }> {
  const [postResponse, commentsResponse] = await Promise.all([
    fetch(`/api/posts/${id}`, { cache: 'no-store' }),
    fetch(`/api/posts/${id}/comments`, { cache: 'no-store' }),
  ]);
  const postResult = (await postResponse.json()) as { post?: Post; error?: string };
  if (!postResponse.ok || !postResult.post) throw new Error(postResult.error || 'Không tải được bài viết.');
  const commentResult = (await commentsResponse.json()) as { comments?: PublicComment[] };
  return {
    post: postResult.post,
    comments: commentsResponse.ok ? commentResult.comments ?? [] : [],
  };
}

export default function PostDetail({ id }: { id: string }) {
  const { user } = useSession();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ postId?: string; commentId?: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchPostData(id);
      setPost(result.post);
      setComments(result.comments);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    fetchPostData(id)
      .then((result) => {
        if (active) {
          setPost(result.post);
          setComments(result.comments);
        }
      })
      .catch((error: unknown) => {
        if (active) notify(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.is_verified) {
      notify('Đăng nhập và xác thực sinh viên để bình luận.', 'info');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/posts/${id}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Không thể gửi bình luận.');
      setContent('');
      await refresh();
      notify('Đã đăng bình luận.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function vote(value: 1 | -1) {
    if (!user?.is_verified) {
      notify('Đăng nhập và xác thực sinh viên để vote review.', 'info');
      return;
    }
    try {
      const response = await fetch(`/api/posts/${id}/vote`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      const result = (await response.json()) as { error?: string; upvotes: number; downvotes: number; userVote: 1 | -1 | null };
      if (!response.ok) throw new Error(result.error || 'Không thể vote.');
      setPost((current) => current ? { ...current, upvotes: result.upvotes, downvotes: result.downvotes, currentUserVote: result.userVote } : current);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.', 'error');
    }
  }

  async function editComment(comment: PublicComment) {
    const updated = window.prompt('Chỉnh sửa bình luận', comment.content);
    if (updated === null || updated.trim() === comment.content) return;
    try {
      const response = await fetch(`/api/profile/comments/${comment.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: updated }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Không thể sửa bình luận.');
      notify('Đã sửa bình luận.', 'success');
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.', 'error');
    }
  }

  async function deleteComment(comment: PublicComment) {
    if (!window.confirm('Bạn có chắc muốn xóa bình luận này?')) return;
    try {
      const response = await fetch(`/api/profile/comments/${comment.id}`, { method: 'DELETE' });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Không thể xóa bình luận.');
      await refresh();
      notify('Đã xóa bình luận.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.', 'error');
    }
  }

  async function deletePost() {
    if (!post || !window.confirm('Bạn có chắc muốn xóa bài viết này? Thao tác không thể hoàn tác.')) return;
    try {
      const response = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Không thể xóa bài viết.');
      window.location.assign(post.type === 'review' ? '/review' : '/');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.', 'error');
    }
  }

  if (loading) return <div className="rounded-3xl bg-white p-10 text-center text-[#64766e]">Đang tải bài viết...</div>;
  if (!post) return <div className="rounded-3xl bg-white p-10 text-center">Không tìm thấy bài viết. <Link href="/" className="font-semibold text-[#187b5b]">Về trang chủ</Link></div>;
  const isOwner = user?.id === post.userId;
  const roomTypeLabel = post.type === 'roommate'
    ? ({ private: 'Phòng riêng', shared: 'Ở ghép', studio: 'Studio' } as const)[post.roomType]
    : 'Review địa điểm';

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={post.type === 'review' ? '/review' : '/'} className="mb-5 inline-flex font-semibold text-[#187b5b]">← Quay lại danh sách</Link>
      <article className="overflow-hidden rounded-3xl border border-[#e5e9e2] bg-white">
        {post.images[0] && <div role="img" aria-label={`Ảnh: ${post.title}`} className="h-64 bg-cover bg-center sm:h-96" style={{ backgroundImage: `url("${post.images[0].replaceAll('"', '%22')}")` }} />}
        <div className="p-6 sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-[#e6f3ec] px-3 py-1.5 text-xs font-bold text-[#187b5b]">{roomTypeLabel}</span>
            {post.type === 'review' && <span className="font-bold text-[#d88720]">★ {post.rating}/5</span>}
          </div>
          <h1 className="mt-5 text-3xl font-bold leading-tight">{post.title}</h1>
          <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-[#53685f]">{post.content}</p>
          {post.type === 'roommate' ? (
            <div className="mt-6 grid gap-4 rounded-2xl bg-[#f7f8f5] p-5 sm:grid-cols-2">
              <p><strong>Giá thuê:</strong> {post.price.toLocaleString('vi-VN')} ₫/tháng</p>
              <p><strong>Loại phòng:</strong> {roomTypeLabel}</p>
              <p><strong>Khu vực:</strong> {post.area} · {post.district}</p>
              <p><strong>Số người cần tìm:</strong> {post.peopleNeeded}</p>
              <p><strong>Liên hệ:</strong> {post.contactInfo}</p>
              <p><strong>Giới tính:</strong> {post.genderPreference === 'any' ? 'Không yêu cầu' : post.genderPreference === 'female' ? 'Nữ' : 'Nam'}</p>
              <p className="sm:col-span-2"><strong>Tiện ích:</strong> {post.amenities.join(' · ') || 'Chưa cập nhật'}</p>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-[#f7f8f5] p-5">
              <p className="font-bold">{post.placeName}</p>
              <p className="mt-1 text-sm text-[#64766e]">{post.placeAddress} · {post.placeType} · Mức giá: {post.priceRange}</p>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            {post.tags.map((tag) => <span key={tag} className="rounded-full bg-[#f2f5f1] px-3 py-1.5 text-xs text-[#64766e]">{tag}</span>)}
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0eb] pt-5">
            <p className="text-sm text-[#64766e]">Đăng bởi {post.author?.name ?? 'Sinh viên'} · {new Date(post.createdAt).toLocaleDateString('vi-VN')}</p>
            <div className="flex flex-wrap gap-2">
              {user?.is_verified && post.type === 'review' && (
                <>
                  <button onClick={() => void vote(1)} aria-pressed={post.currentUserVote === 1} className={`rounded-full px-4 py-2 text-sm font-bold ${post.currentUserVote === 1 ? 'bg-[#187b5b] text-white' : 'bg-[#e6f3ec] text-[#187b5b]'}`}>▲ {post.upvotes}</button>
                  <button onClick={() => void vote(-1)} aria-pressed={post.currentUserVote === -1} className={`rounded-full px-4 py-2 text-sm font-bold ${post.currentUserVote === -1 ? 'bg-[#a33d31] text-white' : 'bg-[#f8e9e6] text-[#a33d31]'}`}>▼ {post.downvotes}</button>
                </>
              )}
              {user?.is_verified && !isOwner && <button onClick={() => setReportTarget({ postId: post.id })} className="rounded-full border border-[#dce4dd] px-4 py-2 text-sm font-semibold text-[#64766e]">Báo cáo</button>}
              {isOwner && <button onClick={() => setEditing(true)} className="rounded-full border border-[#dce4dd] px-4 py-2 text-sm font-semibold text-[#187b5b]">Sửa bài</button>}
              {isOwner && <button onClick={() => void deletePost()} className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700">Xóa bài</button>}
            </div>
          </div>
        </div>
      </article>

      <section className="mt-6 rounded-3xl border border-[#e5e9e2] bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-bold">Bình luận ({comments.length})</h2>
        {user?.is_verified ? (
          <form onSubmit={(event) => void submitComment(event)} className="mt-5">
            <label htmlFor="comment-content" className="sr-only">Nội dung bình luận</label>
            <textarea id="comment-content" required maxLength={2000} rows={3} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Chia sẻ ý kiến của bạn..." className="w-full rounded-xl border border-[#dce4dd] px-4 py-3 outline-none focus:border-[#187b5b]" />
            <button disabled={busy} className="mt-3 rounded-full bg-[#187b5b] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Đang kiểm duyệt...' : 'Gửi bình luận'}</button>
          </form>
        ) : <p className="mt-4 text-sm text-[#64766e]">Đăng nhập và xác thực sinh viên để bình luận.</p>}
        <div className="mt-6 divide-y divide-[#edf0eb]">
          {comments.map((comment) => (
            <article key={comment.id} className="py-5 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{comment.author} <span className="ml-2 text-xs font-normal text-[#819188]">{new Date(comment.createdAt).toLocaleString('vi-VN')}</span></p>
                <div className="flex gap-3 text-xs font-semibold">
                  {user?.is_verified && user.id === comment.userId && <>
                    <button onClick={() => void editComment(comment)} className="text-[#187b5b]">Sửa</button>
                    <button onClick={() => void deleteComment(comment)} className="text-red-700">Xóa</button>
                  </>}
                  {user?.is_verified && user.id !== comment.userId && <button onClick={() => setReportTarget({ commentId: comment.id })} className="text-[#64766e]">Báo cáo</button>}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#53685f]">{comment.content}</p>
            </article>
          ))}
          {comments.length === 0 && <p className="py-5 text-sm text-[#819188]">Chưa có bình luận nào.</p>}
        </div>
      </section>
      {editing && <PostForm type={post.type} post={post} onClose={() => setEditing(false)} onSaved={() => void refresh()} />}
      {reportTarget && <ReportForm open onClose={() => setReportTarget(null)} {...reportTarget} />}
    </div>
  );
}
