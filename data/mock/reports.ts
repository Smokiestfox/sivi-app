import type { AIModerationResult } from '@/types';

export interface MockAdminReport {
  id: string;
  reason: 'spam' | 'abuse' | 'misinformation' | 'other';
  description: string;
  created_at: string;
  reporter_name: string;
  post_id: string | null;
  post_type: 'roommate' | 'review' | null;
  post_title: string | null;
  post_status: 'active' | 'pending_review' | 'rejected' | 'hidden' | null;
  post_content: string | null;
  post_moderation: AIModerationResult | null;
  post_owner_name: string | null;
  comment_id: string | null;
  comment_content: string | null;
  comment_moderation: AIModerationResult | null;
  comment_owner_name: string | null;
  pending_report_count: number;
}

export const mockReports: MockAdminReport[] = [
  {
    id: 'report-1',
    created_at: '2025-03-15T02:00:00Z',
    reporter_name: 'Nguyễn Thị Mai',
    post_id: 'post-r4',
    post_type: 'roommate',
    post_title: 'Phòng studio central gần trung tâm',
    post_status: 'pending_review',
    post_content:
      'Studio rất đẹp, gần trung tâm khu vực. Gần vỉa hè, gần các quán ăn ngon. Phòng sạch, đẹp, được trang bị full. Cần tìm 1 người ở chung.',
    post_moderation: { passed: true },
    post_owner_name: 'Trần Văn An',
    comment_id: null,
    comment_content: null,
    comment_moderation: null,
    comment_owner_name: null,
    pending_report_count: 1,
    reason: 'misinformation',
    description: 'Thông tin khu vực trong bài chưa khớp với địa chỉ được mô tả.',
  },
  {
    id: 'report-2',
    created_at: '2025-03-15T03:10:00Z',
    reporter_name: 'Trần Văn An',
    post_id: null,
    post_type: null,
    post_title: null,
    post_status: null,
    post_content: null,
    post_moderation: null,
    post_owner_name: null,
    comment_id: 'comment-2',
    comment_content: 'Quán có chỗ gửi xe không bạn?',
    comment_moderation: { passed: true },
    comment_owner_name: 'Hoàng Thị Lan',
    pending_report_count: 1,
    reason: 'spam',
    description: 'Người báo cáo nghi là spam; nội dung có vẻ là câu hỏi bình thường để minh họa lựa chọn giữ nội dung.',
  },
];
