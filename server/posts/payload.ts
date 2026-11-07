import { z } from "zod";
import {
  genderPreferenceEnum, placeTypeEnum, priceRangeEnum, roomTypeEnum,
} from "../db/schema";
import { ForumError } from "../forum/errors";
import { boundedBody, positiveId, validate } from "../forum/mutation";

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).nullish();
const money = z.number().min(0).max(2_000_000_000);
const rating = z.number().int().min(1).max(5);
const common = {
  title: text(120),
  content: text(5_000),
  address: optionalText(300),
  googleMapsUrl: z.url({ protocol: /^https?$/ }).max(2_048).nullish(),
};

export const postPayload = z.discriminatedUnion("type", [
  z.strictObject({
    ...common,
    type: z.literal("roommate"),
    rent: money,
    peopleNeeded: z.number().int().min(1).max(20),
    genderPreference: z.enum(genderPreferenceEnum.enumValues).default("any"),
    areaM2: z.number().positive().max(9_999.99).nullish(),
    roommateRequirements: optionalText(5_000),
    roomType: z.enum(roomTypeEnum.enumValues),
    district: optionalText(100),
    amenities: z.array(text(80)).max(20).default([]),
    contactInfo: optionalText(255),
  }),
  z.strictObject({
    ...common,
    type: z.literal("review"),
    placeName: text(200),
    placeType: z.enum(placeTypeEnum.enumValues),
    referencePrice: money.nullish(),
    rating,
    experience: optionalText(5_000),
    priceRange: z.enum(priceRangeEnum.enumValues),
    wifiRating: rating.nullish(),
    atmosphereRating: rating.nullish(),
    serviceRating: rating.nullish(),
  }),
]);

const maxImages = 5;
const maxImageBytes = 5 * 1024 * 1024;
const filesSchema = z.array(z.file().min(1).max(maxImageBytes)).max(maxImages);
const keptImagesSchema = z.array(positiveId).max(maxImages)
  .refine((ids) => new Set(ids).size === ids.length, "ID ảnh giữ lại bị trùng.");

export type PostPayload = z.output<typeof postPayload>;

function readPart(form: FormData, key: string) {
  const parts = form.getAll(key);
  if (parts.length === 1 && typeof parts[0] === "string") {
    try {
      return JSON.parse(parts[0]) as unknown;
    } catch {
      // Return the same field error for malformed and repeated parts.
    }
  }
  throw new ForumError("VALIDATION_ERROR", "Dữ liệu bài đăng không hợp lệ.", {
    [key]: "Cần đúng một trường JSON hợp lệ.",
  });
}

export async function readPostForm(request: Request, editing = false) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "multipart/form-data") {
    throw new ForumError("VALIDATION_ERROR", "Yêu cầu phải gửi dưới dạng multipart/form-data.");
  }
  let form: FormData;
  try {
    form = await boundedBody(request, maxImages * maxImageBytes + 256 * 1024).formData();
  } catch (error) {
    if (error instanceof ForumError) throw error;
    throw new ForumError("VALIDATION_ERROR", "Không đọc được dữ liệu form.");
  }

  const schema = z.object({ payload: postPayload, images: filesSchema, keepImageIds: keptImagesSchema });
  const parsed = validate(schema, {
    payload: readPart(form, "payload"),
    images: form.getAll("images"),
    keepImageIds: editing ? readPart(form, "keepImageIds") : [],
  });
  if (parsed.images.length + parsed.keepImageIds.length > maxImages) {
    throw new ForumError("VALIDATION_ERROR", "Mỗi bài chỉ được có tối đa 5 ảnh.");
  }
  return parsed;
}

export function moderationText(payload: PostPayload) {
  const detail = payload.type === "roommate"
    ? [payload.district, payload.roommateRequirements, payload.contactInfo, ...payload.amenities]
    : [payload.placeName, payload.experience];

  return {
    title: payload.title,
    body: [payload.content, payload.address, payload.googleMapsUrl, ...detail].filter(Boolean).join("\n"),
  };
}
