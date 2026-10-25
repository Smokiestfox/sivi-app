'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Empty, Input, Spin, Tag, Typography } from 'antd';
import { notify } from '@/components/feedback';
import { useSession } from '@/components/useSession';

interface AdminReport {
  id: string;
  reason: string;
  description: string;
  created_at: string;
  reporter_name: string;
  post_id: string | null;
  post_type: string | null;
  post_title: string | null;
  post_status: string | null;
  post_content: string | null;
  post_moderation: { passed?: boolean; reason?: string; flaggedKeywords?: string[] } | null;
  post_owner_name: string | null;
  comment_id: string | null;
  comment_content: string | null;
  comment_moderation: { passed?: boolean; reason?: string; flaggedKeywords?: string[] } | null;
  comment_owner_name: string | null;
  pending_report_count: number;
}

export default function AdminDashboard() {
  const { user, loaded } = useSession();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState('');

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/reports', { cache: 'no-store' });
      const result = (await response.json()) as { reports?: AdminReport[]; error?: string };
      if (!response.ok) throw new Error(result.error || 'Không tải được báo cáo.');
      setReports(result.reports ?? []);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    let active = true;
    fetch('/api/admin/reports', { cache: 'no-store' })
      .then(async (response) => {
        const result = (await response.json()) as { reports?: AdminReport[]; error?: string };
        if (!response.ok) throw new Error(result.error || 'Không tải được báo cáo.');
        if (active) {
          setReports(result.reports ?? []);
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
  }, [user]);

  async function resolve(report: AdminReport, decision: 'keep' | 'remove') {
    const note = notes[report.id] ?? '';
    if (decision === 'remove' && !note.trim()) {
      notify('Nhập lý do gỡ nội dung trước khi xác nhận.', 'error');
      return;
    }
    if (decision === 'remove' && !window.confirm('Xác nhận ẩn nội dung và thông báo cho chủ bài?')) return;
    setBusyId(report.id);
    try {
      const response = await fetch(`/api/admin/reports/${report.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decision, note }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || 'Không thể xử lý báo cáo.');
      notify(result.message || 'Đã xử lý báo cáo.', 'success');
      await refresh();
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Không thể kết nối máy chủ.', 'error');
    } finally {
      setBusyId('');
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <Typography.Title level={1} style={{ color: '#18352d' }}>Quản trị báo cáo</Typography.Title>
      {!loaded || (user?.role === 'admin' && loading) ? <div className="py-16 text-center"><Spin size="large" /></div> : user?.role !== 'admin' ? (
        <Card><p className="text-[#64766e]">Bạn cần quyền quản trị để xem nội dung này.</p></Card>
      ) : error ? (
        <Card><p role="alert" className="text-red-700">{error}</p><Button className="mt-4" onClick={() => void refresh()}>Thử lại</Button></Card>
      ) : reports.length === 0 ? (
        <Card><Empty description="Không có báo cáo đang chờ xử lý" /></Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[#64766e]">{reports.length} báo cáo cần xử lý</p>
          {reports.map((report) => {
            const commentTarget = report.comment_id !== null;
            const targetText = commentTarget ? report.comment_content : report.post_content;
            const moderation = commentTarget ? report.comment_moderation : report.post_moderation;
            const owner = commentTarget ? report.comment_owner_name : report.post_owner_name;
            return (
              <Card key={report.id} className="!rounded-2xl">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Tag color={report.reason === 'spam' ? 'orange' : 'red'}>{report.reason}</Tag>
                    <Tag color="blue">{commentTarget ? 'Bình luận' : report.post_type === 'review' ? 'Review' : 'Roommate'}</Tag>
                    <p className="mt-2 text-sm text-[#64766e]">Báo cáo bởi {report.reporter_name} · {new Date(report.created_at).toLocaleString('vi-VN')} · {report.pending_report_count} báo cáo đang chờ cho nội dung</p>
                  </div>
                  <Tag color={moderation?.passed ? 'green' : 'red'}>
                    AI: {moderation ? moderation.passed ? 'Đạt' : 'Bị gắn cờ' : 'Không có kết quả'}
                  </Tag>
                </div>
                {!commentTarget && <h2 className="mt-4 text-lg font-bold">{report.post_title}</h2>}
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#f7f8f5] p-4 text-sm leading-6">{targetText}</p>
                <p className="mt-3 text-sm"><strong>Chủ nội dung:</strong> {owner || 'Không xác định'}</p>
                <p className="mt-2 text-sm"><strong>Lý do:</strong> {report.reason} {report.description && `— ${report.description}`}</p>
                {moderation && !moderation.passed && <p className="mt-2 text-sm text-red-700"><strong>Kết quả kiểm duyệt:</strong> {moderation.reason || moderation.flaggedKeywords?.join(', ')}</p>}
                <Input.TextArea
                  className="!mt-4"
                  rows={2}
                  maxLength={1000}
                  placeholder="Lý do gỡ (bắt buộc nếu chọn gỡ nội dung)"
                  value={notes[report.id] ?? ''}
                  onChange={(event) => setNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                />
                <div className="mt-4 flex flex-wrap justify-end gap-3">
                  <Button disabled={busyId === report.id} onClick={() => void resolve(report, 'keep')}>Giữ nội dung</Button>
                  <Button danger type="primary" loading={busyId === report.id} onClick={() => void resolve(report, 'remove')}>Gỡ nội dung</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
