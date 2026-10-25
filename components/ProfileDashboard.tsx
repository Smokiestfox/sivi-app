'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import PostForm from '@/components/PostForm';
import { notify } from '@/components/feedback';
import { useSession } from '@/components/useSession';
import type { Comment, Notification, Post } from '@/types';

interface ProfileComment extends Comment {
  postTitle: string;
  status: 'active' | 'hidden';
}

interface ProfileData {
  posts: Post[];
  comments: ProfileComment[];
}

export default function ProfileDashboard() {
  const { user, loaded } = useSession();
  const [data, setData] = useState<ProfileData>({ posts: [], comments: [] });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Post | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch('/api/profile', { cache: 'no-store' });
    const result = (await response.json()) as ProfileData & { error?: string };
    if (!response.ok) throw new Error(result.error || 'Không tải được dữ liệu cá nhân.');
    setData(result);
    const notificationResponse = await fetch('/api/notifications', { cache: 'no-store' });
    if (!notificationResponse.ok) throw new Error('Không tải được thông báo.');
    const notificationResult = (await notificationResponse.json()) as { notifications: Notification[] };
    setNotifications(notificationResult.notifications);
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetch('/api/profile', { cache: 'no-store' })
      .then(async (response) => {
        const result = (await response.json()) as ProfileData & { error?: string };
        if (!response.ok) throw new Error(result.error || 'Không tải được dữ liệu cá nhân.');
        if (active) setData(result);
        return fetch('/api/notifications', { cache: 'no-store' });
      })
      .then(async (response) => {
        if (!response?.ok) throw new Error('Không tải được thông báo.');
        const result = (await response.json()) as { notifications: Notification[] };
        if (active) setNotifications(result.notifications);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Không tải được dữ liệu.');
      });
    return () => { active = false; };
  }, [user]);

  async function deletePost(post: Post) {
    if (!window.confirm('Bạn có chắc muốn xóa bài đăng này?')) return;
    try {
      const response = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Không thể xóa bài đăng.');
      notify('Đã xóa bài đăng.', 'success');
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.', 'error');
    }
  }

  async function editComment(comment: ProfileComment) {
    const content = window.prompt('Chỉnh sửa bình luận', comment.content);
    if (content === null || content.trim() === comment.content) return;
    try {
      const response = await fetch(`/api/profile/comments/${comment.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Không thể sửa bình luận.');
      notify('Đã sửa bình luận.', 'success');
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.', 'error');
    }
  }

  async function deleteComment(comment: ProfileComment) {
    if (!window.confirm('Bạn có chắc muốn xóa bình luận này?')) return;
    try {
      const response = await fetch(`/api/profile/comments/${comment.id}`, { method: 'DELETE' });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Không thể xóa bình luận.');
      notify('Đã xóa bình luận.', 'success');
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.', 'error');
    }
  }

  async function markRead(notification: Notification) {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: notification.id }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Không thể cập nhật thông báo.');
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read: true } : item));
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.', 'error');
    }
  }

  if (!loaded) return <div className="mx-auto max-w-6xl px-5 py-16">Đang tải tài khoản...</div>;
  if (!user) {
    return (
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="rounded-3xl bg-white p-10 text-center">
          <h1 className="text-3xl font-bold">Đăng nhập để xem trang cá nhân</h1>
          <a href="/api/auth/google" className="mt-5 inline-flex rounded-full bg-[#187b5b] px-5 py-3 font-bold text-white">Đăng nhập Google</a>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#187b5b]">Tài khoản của bạn</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Bài viết & bình luận của tôi</h1>
      <p className="mt-3 text-[#64766e]">{user.name} · {user.email} · {user.is_verified ? 'Sinh viên đã xác thực' : 'Tài khoản khách'}</p>
      {!user.is_verified && <p className="mt-3 rounded-xl bg-[#fff4df] p-4 text-sm text-[#73531c]">Xác thực sinh viên ở thanh điều hướng để mở quyền đăng bài, bình luận, vote và báo cáo.</p>}
      {error && <p role="alert" className="mt-5 text-sm text-red-700">{error} <button onClick={() => void refresh()} className="underline">Thử lại</button></p>}

      <section className="mt-8">
        <h2 className="text-2xl font-bold">Bài đăng của tôi ({data.posts.length})</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {data.posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-[#e5e9e2] bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-[#187b5b]">{post.status === 'active' ? 'Đang hiển thị' : post.status === 'hidden' ? 'Đã ẩn' : post.status}</p>
              <h3 className="mt-2 text-lg font-bold">{post.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-[#64766e]">{post.content}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/posts/${post.id}`} className="rounded-full bg-[#f1f4f0] px-4 py-2 text-sm font-semibold">Xem</Link>
                {user.is_verified && <button onClick={() => setEditing(post)} className="rounded-full bg-[#e6f3ec] px-4 py-2 text-sm font-semibold text-[#187b5b]">Sửa</button>}
                {user.is_verified && <button onClick={() => void deletePost(post)} className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">Xóa</button>}
              </div>
            </article>
          ))}
          {data.posts.length === 0 && <p className="rounded-2xl bg-white p-6 text-sm text-[#64766e]">Bạn chưa đăng bài nào.</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">Bình luận của tôi ({data.comments.length})</h2>
        <div className="mt-4 divide-y divide-[#e5e9e2] rounded-2xl border border-[#e5e9e2] bg-white px-5">
          {data.comments.map((comment) => (
            <article key={comment.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0 flex-1">
                <Link href={`/posts/${comment.postId}`} className="text-sm font-bold text-[#187b5b] hover:underline">{comment.postTitle}</Link>
                <p className="mt-1 line-clamp-2 text-sm text-[#64766e]">{comment.content}</p>
                {comment.status === 'hidden' && <span className="text-xs text-red-700">Bình luận đã bị ẩn</span>}
              </div>
              {user.is_verified && (
                <div className="flex gap-2">
                  <button onClick={() => void editComment(comment)} className="rounded-full bg-[#e6f3ec] px-3 py-2 text-xs font-semibold text-[#187b5b]">Sửa</button>
                  <button onClick={() => void deleteComment(comment)} className="rounded-full bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Xóa</button>
                </div>
              )}
            </article>
          ))}
          {data.comments.length === 0 && <p className="py-5 text-sm text-[#64766e]">Bạn chưa có bình luận nào.</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">Thông báo</h2>
        <div className="mt-4 space-y-3">
          {notifications.map((notification) => (
            <article key={notification.id} className={`rounded-2xl border bg-white p-4 ${notification.read ? 'border-[#e5e9e2]' : 'border-[#b9d9c7]'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{notification.title}</h3>
                  <p className="mt-1 text-sm text-[#64766e]">{notification.message}</p>
                </div>
                {!notification.read && <button onClick={() => void markRead(notification)} className="text-xs font-semibold text-[#187b5b]">Đánh dấu đã đọc</button>}
              </div>
            </article>
          ))}
          {notifications.length === 0 && <p className="rounded-2xl bg-white p-5 text-sm text-[#64766e]">Chưa có thông báo.</p>}
        </div>
      </section>
      {editing && <PostForm type={editing.type} post={editing} onClose={() => setEditing(null)} onSaved={() => void refresh()} />}
    </section>
  );
}
