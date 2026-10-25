import { HttpError, boundedString, stringArray } from '@/lib/http';
import type { PostType } from '@/types';

const roomTypes = ['private', 'shared', 'studio'];
const genders = ['male', 'female', 'any'];
const placeTypes = ['cafe', 'restaurant', 'street_food', 'other'];
const priceRanges = ['low', 'medium', 'high'];

function integerIn(value: unknown, label: string, minimum: number, maximum: number): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new HttpError(400, `${label} không hợp lệ.`);
  }
  return number;
}

function optionalRating(value: unknown, label: string): number | null {
  return value === undefined || value === null || value === ''
    ? null
    : integerIn(value, label, 1, 5);
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new HttpError(400, `${label} không hợp lệ.`);
  }
  return value as T;
}

export function validatePost(body: Record<string, unknown>, type: PostType) {
  const common = {
    title: boundedString(body.title, 'Tiêu đề', 120),
    content: boundedString(body.content, 'Nội dung', 5000),
    images: stringArray(body.images, 'Ảnh', 5, 2048).map((source) => {
      try {
        const url = new URL(source);
        if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
        return url.toString();
      } catch {
        throw new HttpError(400, 'Mỗi ảnh cần là một URL HTTPS hợp lệ.');
      }
    }),
    tags: stringArray(body.tags, 'Thẻ', 12, 40),
  };

  if (type === 'roommate') {
    const contactInfo = boundedString(body.contactInfo, 'Thông tin liên hệ', 200);
    if (!/^(Zalo:|Email:|Điện thoại:)/i.test(contactInfo)) {
      throw new HttpError(400, 'Thông tin liên hệ cần bắt đầu bằng Zalo:, Email: hoặc Điện thoại:.');
    }
    return {
      type,
      ...common,
      price: integerIn(body.price, 'Giá thuê', 0, 2_000_000_000),
      area: boundedString(body.area, 'Địa chỉ khu vực', 200),
      district: boundedString(body.district, 'Quận/huyện', 100),
      roomType: enumValue(body.roomType, roomTypes, 'Loại phòng'),
      peopleNeeded: integerIn(body.peopleNeeded, 'Số người cần tìm', 1, 20),
      amenities: stringArray(body.amenities, 'Tiện ích', 20, 80),
      genderPreference: enumValue(body.genderPreference, genders, 'Giới tính ưu tiên'),
      contactInfo,
    };
  }

  return {
    type,
    ...common,
    placeName: boundedString(body.placeName, 'Tên địa điểm', 200),
    placeAddress: boundedString(body.placeAddress, 'Địa chỉ địa điểm', 300),
    placeType: enumValue(body.placeType, placeTypes, 'Loại địa điểm'),
    rating: integerIn(body.rating, 'Điểm đánh giá', 1, 5),
    priceRange: enumValue(body.priceRange, priceRanges, 'Mức giá'),
    wifiRating: optionalRating(body.wifiRating, 'Điểm Wifi'),
    atmosphereRating: optionalRating(body.atmosphereRating, 'Điểm không gian'),
    serviceRating: optionalRating(body.serviceRating, 'Điểm phục vụ'),
  };
}
