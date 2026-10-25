'use client';

import { useState, type FormEvent } from 'react';
import type { Post, PostType } from '@/types';
import Modal from '@/components/Modal';
import { notify } from '@/components/feedback';

interface Draft {
  title: string;
  content: string;
  images: string;
  tags: string;
  price: string;
  area: string;
  district: string;
  roomType: string;
  peopleNeeded: string;
  amenities: string;
  genderPreference: string;
  contactInfo: string;
  placeName: string;
  placeAddress: string;
  placeType: string;
  rating: string;
  priceRange: string;
  wifiRating: string;
  atmosphereRating: string;
  serviceRating: string;
}

function initialDraft(post?: Post): Draft {
  const base: Draft = {
    title: '', content: '', images: '', tags: '', price: '', area: '', district: '',
    roomType: 'shared', peopleNeeded: '1', amenities: '', genderPreference: 'any',
    contactInfo: '', placeName: '', placeAddress: '', placeType: 'cafe',
    rating: '5', priceRange: 'medium', wifiRating: '', atmosphereRating: '', serviceRating: '',
  };
  if (!post) return base;
  const common = {
    title: post.title,
    content: post.content,
    images: post.images.join('\n'),
    tags: post.tags.join(', '),
  };
  if (post.type === 'roommate') {
    return {
      ...base, ...common, price: String(post.price), area: post.area, district: post.district,
      roomType: post.roomType, peopleNeeded: String(post.peopleNeeded),
      amenities: post.amenities.join(', '), genderPreference: post.genderPreference,
      contactInfo: post.contactInfo,
    };
  }
  return {
    ...base, ...common, placeName: post.placeName, placeAddress: post.placeAddress,
    placeType: post.placeType, rating: String(post.rating), priceRange: post.priceRange,
    wifiRating: post.wifiRating ? String(post.wifiRating) : '',
    atmosphereRating: post.atmosphereRating ? String(post.atmosphereRating) : '',
    serviceRating: post.serviceRating ? String(post.serviceRating) : '',
  };
}

const inputClass =
  'mt-1.5 w-full rounded-xl border border-[#dce4dd] bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#187b5b]';

export default function PostForm({
  type,
  post,
  onClose,
  onSaved,
}: {
  type: PostType;
  post?: Post;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(() => initialDraft(post));
  const [busy, setBusy] = useState(false);
  const update = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const common = {
      title: draft.title,
      content: draft.content,
      images: draft.images.split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
      tags: draft.tags.split(',').map((item) => item.trim()).filter(Boolean),
    };
    const payload = type === 'roommate'
      ? {
          ...common,
          ...(!post ? { type } : {}),
          price: Number(draft.price),
          area: draft.area,
          district: draft.district,
          roomType: draft.roomType,
          peopleNeeded: Number(draft.peopleNeeded),
          amenities: draft.amenities.split(',').map((item) => item.trim()).filter(Boolean),
          genderPreference: draft.genderPreference,
          contactInfo: draft.contactInfo,
        }
      : {
          ...common,
          ...(!post ? { type } : {}),
          placeName: draft.placeName,
          placeAddress: draft.placeAddress,
          placeType: draft.placeType,
          rating: Number(draft.rating),
          priceRange: draft.priceRange,
          wifiRating: draft.wifiRating ? Number(draft.wifiRating) : null,
          atmosphereRating: draft.atmosphereRating ? Number(draft.atmosphereRating) : null,
          serviceRating: draft.serviceRating ? Number(draft.serviceRating) : null,
        };
    try {
      const response = await fetch(post ? `/api/posts/${post.id}` : '/api/posts', {
        method: post ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Không thể lưu bài viết.');
      notify(post ? 'Đã cập nhật bài viết.' : 'Đã đăng bài viết.', 'success');
      onSaved();
      onClose();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const field = (label: string, key: keyof Draft, props: { required?: boolean; type?: string; min?: string; max?: string; placeholder?: string } = {}) => (
    <label className="block text-sm font-semibold text-[#36564a]">
      {label}
      <input
        className={inputClass}
        type={props.type ?? 'text'}
        required={props.required}
        min={props.min}
        max={props.max}
        placeholder={props.placeholder}
        value={draft[key]}
        onChange={(event) => update(key, event.target.value)}
      />
    </label>
  );
  const select = (label: string, key: keyof Draft, options: Array<[string, string]>) => (
    <label className="block text-sm font-semibold text-[#36564a]">
      {label}
      <select className={inputClass} value={draft[key]} onChange={(event) => update(key, event.target.value)}>
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  );

  return (
    <Modal open title={post ? 'Chỉnh sửa bài viết' : type === 'roommate' ? 'Đăng tin tìm roommate' : 'Viết review địa điểm'} onClose={onClose} size="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        {field('Tiêu đề', 'title', { required: true, placeholder: 'Tiêu đề bài viết' })}
        <label className="block text-sm font-semibold text-[#36564a]">
          Nội dung
          <textarea required maxLength={5000} rows={4} className={`${inputClass} resize-y`} value={draft.content} onChange={(event) => update('content', event.target.value)} />
        </label>
        {type === 'roommate' ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {field('Giá thuê mỗi tháng (₫)', 'price', { type: 'number', min: '0', required: true })}
              {field('Số người cần tìm', 'peopleNeeded', { type: 'number', min: '1', max: '20', required: true })}
              {field('Khu vực địa chỉ', 'area', { required: true })}
              {field('Quận/huyện', 'district', { required: true })}
              {select('Loại phòng', 'roomType', [['private', 'Phòng riêng'], ['shared', 'Ở ghép'], ['studio', 'Studio']])}
              {select('Ưu tiên giới tính', 'genderPreference', [['any', 'Không yêu cầu'], ['female', 'Nữ'], ['male', 'Nam']])}
            </div>
            {field('Thông tin liên hệ (Zalo:, Email: hoặc Điện thoại:)', 'contactInfo', { required: true })}
            {field('Tiện ích, phân tách bằng dấu phẩy', 'amenities', { placeholder: 'Wifi, Máy giặt, Điều hòa' })}
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {field('Tên địa điểm', 'placeName', { required: true })}
              {field('Địa chỉ địa điểm', 'placeAddress', { required: true })}
              {select('Loại địa điểm', 'placeType', [['cafe', 'Cafe'], ['restaurant', 'Nhà hàng'], ['street_food', 'Quán vỉa hè'], ['other', 'Khác']])}
              {select('Đánh giá tổng thể', 'rating', [['5', '5 - Tuyệt vời'], ['4', '4 - Tốt'], ['3', '3 - Bình thường'], ['2', '2 - Chưa tốt'], ['1', '1 - Kém']])}
              {select('Mức giá', 'priceRange', [['low', 'Dưới 50k'], ['medium', '50k - 150k'], ['high', 'Trên 150k']])}
              {select('Wifi (tùy chọn)', 'wifiRating', [['', 'Chưa đánh giá'], ['5', '5'], ['4', '4'], ['3', '3'], ['2', '2'], ['1', '1']])}
              {select('Không gian (tùy chọn)', 'atmosphereRating', [['', 'Chưa đánh giá'], ['5', '5'], ['4', '4'], ['3', '3'], ['2', '2'], ['1', '1']])}
              {select('Phục vụ (tùy chọn)', 'serviceRating', [['', 'Chưa đánh giá'], ['5', '5'], ['4', '4'], ['3', '3'], ['2', '2'], ['1', '1']])}
            </div>
          </>
        )}
        <label className="block text-sm font-semibold text-[#36564a]">
          Ảnh (URL HTTPS, mỗi ảnh một dòng; không bắt buộc)
          <textarea
            rows={2}
            placeholder="https://..."
            className={`${inputClass} resize-y`}
            value={draft.images}
            onChange={(event) => update('images', event.target.value)}
          />
        </label>
        {field('Thẻ, phân tách bằng dấu phẩy', 'tags', { placeholder: 'Gần trường, Giá tốt' })}
        <p className="rounded-xl bg-[#f7f8f5] px-4 py-3 text-xs leading-5 text-[#64766e]">
          Nội dung sẽ được kiểm duyệt tự động trước khi lưu. Nếu dịch vụ kiểm duyệt gặp lỗi, bài viết sẽ không được đăng.
        </p>
        <button disabled={busy} className="w-full rounded-xl bg-[#187b5b] px-5 py-3 font-bold text-white hover:bg-[#12664a] disabled:opacity-60">
          {busy ? 'Đang kiểm duyệt và lưu...' : post ? 'Lưu thay đổi' : 'Đăng bài'}
        </button>
      </form>
    </Modal>
  );
}
