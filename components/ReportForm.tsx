'use client';

import { useState, type FormEvent } from 'react';
import Modal from '@/components/Modal';
import { notify } from '@/components/feedback';

export default function ReportForm({
  open,
  onClose,
  postId,
  commentId,
}: {
  open: boolean;
  onClose: () => void;
  postId?: string;
  commentId?: string;
}) {
  const [reason, setReason] = useState('spam');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ postId, commentId, reason, description }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || 'Không gửi được báo cáo.');
      notify(result.message || 'Đã gửi báo cáo.', 'success');
      onClose();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Báo cáo nội dung" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold text-[#36564a]">
          Lý do
          <select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4dd] px-4 py-3 font-normal">
            <option value="spam">Spam</option>
            <option value="abuse">Xúc phạm hoặc quấy rối</option>
            <option value="misinformation">Sai thông tin</option>
            <option value="other">Lý do khác</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-[#36564a]">
          Ghi chú (không bắt buộc)
          <textarea maxLength={1000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4dd] px-4 py-3 font-normal" />
        </label>
        <button disabled={busy} className="w-full rounded-xl bg-[#187b5b] px-4 py-3 font-bold text-white disabled:opacity-60">
          {busy ? 'Đang gửi...' : 'Gửi báo cáo'}
        </button>
      </form>
    </Modal>
  );
}
