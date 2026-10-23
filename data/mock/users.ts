import { User } from '@/types';

export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Nguyễn Thị Mai',
    email: 'mai.nguyen@vnu.edu.vn',
    avatar: 'https://ui-avatars.com/api/?name=Nguyễn+Thị+Mai&background=random',
    role: 'student',
    isVerified: true,
    university: 'Đại học Quốc gia TP.HCM',
    createdAt: '2025-01-15T10:30:00Z',
  },
  {
    id: 'user-2',
    name: 'Trần Văn An',
    email: 'an.tran@hcmut.edu.vn',
    avatar: 'https://ui-avatars.com/api/?name=Trần+Văn+An&background=random',
    role: 'student',
    isVerified: true,
    university: 'Đại học Bách Khoa TP.HCM',
    createdAt: '2025-02-20T14:20:00Z',
  },
  {
    id: 'user-3',
    name: 'Lê Thị Hoa',
    email: 'hoa.le@gmail.com',
    avatar: 'https://ui-avatars.com/api/?name=Lê+Thị+Hoa&background=random',
    role: 'guest',
    isVerified: false,
    createdAt: '2025-03-01T09:15:00Z',
  },
  {
    id: 'user-4',
    name: 'Phạm Văn Bảo',
    email: 'bao.pham@vnu.edu.vn',
    avatar: 'https://ui-avatars.com/api/?name=Phạm+Văn+Bảo&background=random',
    role: 'student',
    isVerified: true,
    university: 'Đại học Quốc gia TP.HCM',
    createdAt: '2025-01-05T16:45:00Z',
  },
  {
    id: 'user-5',
    name: 'Hoàng Thị Lan',
    email: 'lan.hoang@ueh.edu.vn',
    avatar: 'https://ui-avatars.com/api/?name=Hoàng+Thị+Lan&background=random',
    role: 'student',
    isVerified: true,
    university: 'Đại học Kinh tế TP.HCM',
    createdAt: '2025-02-12T11:00:00Z',
  },
  {
    id: 'user-6',
    name: 'Đỗ Văn Khôi',
    email: 'khoi.do@gmail.com',
    avatar: 'https://ui-avatars.com/api/?name=Đỗ+Văn+Khôi&background=random',
    role: 'student',
    isVerified: false,
    createdAt: '2025-03-10T13:30:00Z',
  },
  {
    id: 'admin-1',
    name: 'Admin SiVi',
    email: 'admin@sivi.app',
    avatar: 'https://ui-avatars.com/api/?name=Admin+SiVi&background=random',
    role: 'admin',
    isVerified: true,
    createdAt: '2025-01-01T00:00:00Z',
  },
];

export const currentUser = mockUsers[2]; // Simulating a guest user initially
export const authenticatedUser = mockUsers[0]; // Simulating an authenticated student