import type { Notification } from '@/types';

export const mockNotifications: Notification[] = [
  {
    id: 'notification-1',
    userId: 'user-2',
    title: 'Bài đăng đang chờ xem xét',
    message: 'Bài “Phòng studio central gần trung tâm” đang có báo cáo cần quản trị viên xem xét.',
    type: 'warning',
    read: false,
    createdAt: '2025-03-15T03:20:00Z',
  },
  {
    id: 'notification-2',
    userId: 'user-1',
    title: 'Có bình luận mới',
    message: 'Trần Văn An đã bình luận về bài tìm roommate của bạn.',
    type: 'info',
    read: true,
    createdAt: '2025-03-12T09:00:00Z',
  },
  {
    id: 'notification-3',
    userId: 'user-5',
    title: 'Báo cáo đã được xử lý',
    message: 'Quản trị viên đã xem xét báo cáo của bạn và quyết định giữ nội dung.',
    type: 'success',
    read: false,
    createdAt: '2025-03-16T10:30:00Z',
  },
];
