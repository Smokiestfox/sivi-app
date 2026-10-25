export type UserRole = 'guest' | 'student' | 'admin';
export type PostType = 'roommate' | 'review';
export type PostStatus = 'active' | 'pending_review' | 'rejected' | 'hidden';
export type ReportStatus = 'pending' | 'resolved_keep' | 'resolved_remove';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  isVerified: boolean;
  university?: string;
  createdAt: string;
}

export interface University {
  id: string;
  name: string;
  domain: string;
}

export interface OTPVerification {
  email: string;
  userId: string;
  universityId: string;
  codeHash: string;
  attempts: number;
  lockedUntil?: string;
  expiresAt: string;
}

export interface BasePost {
  id: string;
  userId: string;
  type: PostType;
  status: PostStatus;
  title: string;
  content: string;
  images: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  reportCount: number;
  currentUserVote?: 1 | -1 | null;
  author?: Pick<User, 'name' | 'avatar'>;
}

export interface RoommatePost extends BasePost {
  type: 'roommate';
  price: number;
  area: string;
  district: string;
  roomType: 'private' | 'shared' | 'studio';
  peopleNeeded: number;
  amenities: string[];
  genderPreference: 'male' | 'female' | 'any';
  contactInfo: string;
}

export interface ReviewPost extends BasePost {
  type: 'review';
  placeName: string;
  placeAddress: string;
  placeType: 'cafe' | 'restaurant' | 'street_food' | 'other';
  rating: number; // 1-5
  priceRange: 'low' | 'medium' | 'high';
  wifiRating?: number;
  atmosphereRating?: number;
  serviceRating?: number;
}

export type Post = RoommatePost | ReviewPost;

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  parentId?: string; // for replies
}

export interface Report {
  id: string;
  postId?: string;
  commentId?: string;
  reporterId: string;
  reason: string;
  description: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

export interface Vote {
  id: string;
  userId: string;
  targetType: 'post' | 'comment';
  targetId: string;
  value: 1 | -1; // 1 = upvote, -1 = downvote
  createdAt: string;
}

export interface AIModerationResult {
  passed: boolean;
  reason?: string;
  flaggedKeywords?: string[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: string;
}

export const UNIVERSITIES: University[] = [
  { id: 'uit', name: 'ĐH Công nghệ Thông tin (UIT)', domain: '@gm.uit.edu.vn' },
  { id: 'hcmut', name: 'ĐH Bách Khoa (HCMUT)', domain: '@hcmut.edu.vn' },
  { id: 'iu', name: 'ĐH Quốc tế (IU)', domain: '@student.hcmiu.edu.vn' },
  { id: 'uel', name: 'ĐH Kinh tế - Luật (UEL)', domain: '@st.uel.edu.vn' },
  { id: 'ussh-hcm', name: 'ĐH KHXH&NV (USSH-HCM)', domain: '@hcmussh.edu.vn' },
];

export const ROOMMATE_TAGS = [
  'Gần trường', 'Giá tốt', 'Full nội thất', 'Có ban công',
  'An ninh 24/7', 'Gần chợ', 'Thoáng mát', 'Để xe dễ',
  'Wifi mạnh', 'Có máy giặt', 'Có điều hòa', 'Mới xây',
];

export const REVIEW_TAGS = [
  'Wifi tốt', 'Không gian đẹp', 'Menu đa dạng', 'Giá hợp lý',
  'Phục vụ nhanh', 'Thích hợp làm việc', 'Thích hợp hẹn hò',
  'View đẹp', 'Đồ ăn ngon', 'Đồ uống ngon', 'Yên tĩnh', 'Sôi động',
];

export const PLACE_TYPES = [
  { value: 'cafe', label: 'Cafe' },
  { value: 'restaurant', label: 'Nhà hàng' },
  { value: 'street_food', label: 'Quán vỉa hè' },
  { value: 'other', label: 'Khác' },
];

export const PRICE_RANGES = [
  { value: 'low', label: 'Dưới 50k' },
  { value: 'medium', label: '50k - 150k' },
  { value: 'high', label: 'Trên 150k' },
];