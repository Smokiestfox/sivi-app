import type { Comment } from '@/types';

export type MockComment = Omit<Comment, 'upvotes' | 'downvotes'> & {
  author: string;
  avatar: string | null;
  status: 'active' | 'hidden';
};

export const mockComments: MockComment[] = [
  {
    id: 'comment-1',
    postId: 'review-1',
    userId: 'user-4',
    author: 'Phạm Văn Bảo',
    avatar: 'https://ui-avatars.com/api/?name=Ph%E1%BA%A1m+V%C4%83n+B%E1%BA%A3o',
    content: 'Mình xác nhận wifi ổn, buổi sáng cũng có khá nhiều chỗ ngồi.',
    status: 'active',
    createdAt: '2025-03-14T11:00:00Z',
    updatedAt: '2025-03-14T11:00:00Z',
  },
  {
    id: 'comment-2',
    postId: 'review-1',
    userId: 'user-5',
    author: 'Hoàng Thị Lan',
    avatar: 'https://ui-avatars.com/api/?name=Ho%C3%A0ng+Th%E1%BB%8B+Lan',
    content: 'Quán có chỗ gửi xe không bạn?',
    status: 'active',
    createdAt: '2025-03-14T12:20:00Z',
    updatedAt: '2025-03-14T12:20:00Z',
  },
  {
    id: 'comment-3',
    postId: 'review-2',
    userId: 'user-1',
    author: 'Nguyễn Thị Mai',
    avatar: 'https://ui-avatars.com/api/?name=Nguy%E1%BB%85n+Th%E1%BB%8B+Mai',
    content: 'Có món chay hoặc lựa chọn ít cay không ạ?',
    status: 'active',
    createdAt: '2025-03-13T06:30:00Z',
    updatedAt: '2025-03-13T06:30:00Z',
  },
  {
    id: 'comment-4',
    postId: 'post-r1',
    userId: 'user-2',
    author: 'Trần Văn An',
    avatar: 'https://ui-avatars.com/api/?name=Tr%E1%BA%A7n+V%C4%83n+An',
    content: 'Phòng còn trống không bạn? Mình muốn hỏi thêm về giờ giấc.',
    status: 'active',
    createdAt: '2025-03-12T08:45:00Z',
    updatedAt: '2025-03-12T08:45:00Z',
  },
];
