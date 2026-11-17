"use client";

import { districts } from "./options";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { PostDto } from "@/server/posts/service";
import type { CurrentUser } from "@/server/auth/current-user";
import { Empty, Toast } from "@/components/ui/Feedback";
import StudentVerificationForm from "@/components/profile/StudentVerificationForm";
import PostForm from "./PostForm";

type PostListProps = {
  posts: PostDto[];
  type: "roommate" | "review";
  user: CurrentUser | null;
};

const money = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const roomLabels = { private: "Phòng riêng", shared: "Ở ghép", studio: "Studio" } as const;
const placeLabels = {
  cafe: "Cafe",
  restaurant: "Quán ăn",
  street_food: "Ăn vặt / đường phố",
  photo: "Photo",
  other: "Địa điểm khác",
} as const;

const priceRanges = [
  { label: "Dưới 1 triệu", min: 0, max: 1000000 },
  { label: "Từ 1 - 2 triệu", min: 1000000, max: 2000000 },
  { label: "Từ 2 - 3 triệu", min: 2000000, max: 3000000 },
  { label: "Từ 3 - 5 triệu", min: 3000000, max: 5000000 },
  { label: "Từ 5 - 7 triệu", min: 5000000, max: 7000000 },
  { label: "Từ 7 - 10 triệu", min: 7000000, max: 10000000 },
  { label: "Từ 10 - 15 triệu", min: 10000000, max: 15000000 },
  { label: "Trên 15 triệu", min: 15000000, max: Infinity },
];

export default function PostList({ posts, type, user }: PostListProps) {
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [roomType, setRoomType] = useState("");
  const [placeType, setPlaceType] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [signInMessage, setSignInMessage] = useState("");
  const [success, setSuccess] = useState("");
  const canPost = user?.role === "student" && user.isVerified;

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    const normalizedDistrict = district.trim().toLocaleLowerCase("vi");
    const range = priceRange === "" ? null : priceRanges[Number(priceRange)];
    return posts.filter((post) => {
      if (normalizedQuery) {
        const text = [
          post.title,
          post.content,
          post.address ?? "",
          post.type === "review" ? post.placeName : "",
          post.type === "roommate" ? post.district ?? "" : "",
        ].join(" ").toLocaleLowerCase("vi");
        if (!text.includes(normalizedQuery)) return false;
      }
      if (type === "roommate" && post.type === "roommate") {
        if (district === "other") {
          if (districts.some((name) => name.toLocaleLowerCase("vi") === (post.district ?? "").trim().toLocaleLowerCase("vi"))) return false;
        } else if (normalizedDistrict && !(post.district ?? "").toLocaleLowerCase("vi").includes(normalizedDistrict)) return false;
        if (range && (post.rent < range.min || post.rent > range.max ||
          (range.min === 0 && post.rent === range.max) ||
          (range.max === Infinity && post.rent === range.min))) return false;
        if (roomType && post.roomType !== roomType) return false;
      }
      if (type === "review" && post.type === "review" && placeType && post.placeType !== placeType) return false;
      return true;
    });
  }, [district, priceRange, placeType, posts, query, roomType, type]);

  function openComposer() {
    if (canPost) {
      setFormOpen(true);
      return;
    }
    if (user?.role === "guest") {
      setVerificationOpen(true);
      return;
    }
    setSignInMessage("Bạn cần đăng nhập trước khi đăng bài. Google OAuth chưa được kết nối trên nhánh hiện tại.");
  }

  return (
    <>
      <div className="grid gap-3 rounded-3xl border border-[#d2dfd0] bg-[#e8efe7] p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className="sm:col-span-2 lg:col-span-2">
          <span className="sr-only">Tìm theo từ khóa hoặc địa điểm</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo từ khóa hoặc địa điểm"
            className="w-full rounded-full border border-[#dce4dd] bg-[#fffdf9] px-4 py-3 text-sm outline-none focus:border-[#187b5b]"
          />
        </label>
        {type === "roommate" ? (
          <>
            <label>
              <span className="sr-only">Khu vực hoặc quận</span>
              <select value={district} onChange={(event) => setDistrict(event.target.value)}
                className="w-full rounded-full border border-[#dce4dd] bg-[#fffdf9] px-4 py-3 text-sm outline-none focus:border-[#187b5b]">
                <option value="">Tất cả khu vực</option>
                {districts.map((name) => <option key={name} value={name}>{name}</option>)}
                <option value="other">Khác</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Khoảng giá thuê mỗi tháng</span>
              <select value={priceRange} onChange={(event) => setPriceRange(event.target.value)}
                className="w-full rounded-full border border-[#dce4dd] bg-[#fffdf9] px-4 py-3 text-sm outline-none focus:border-[#187b5b]">
                <option value="">Tất cả khoảng giá</option>
                {priceRanges.map((range, index) => <option key={range.label} value={index}>{range.label}</option>)}
              </select>
            </label>
            <label className="lg:col-span-2">
              <span className="sr-only">Loại phòng</span>
              <select value={roomType} onChange={(event) => setRoomType(event.target.value)} className="w-full rounded-full border border-[#dce4dd] bg-[#fffdf9] px-4 py-3 text-sm outline-none focus:border-[#187b5b]">
                <option value="">Tất cả loại phòng</option>
                {Object.entries(roomLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </>
        ) : (
          <label className="sm:col-span-2 lg:col-span-2">
            <span className="sr-only">Loại địa điểm</span>
            <select value={placeType} onChange={(event) => setPlaceType(event.target.value)} className="w-full rounded-full border border-[#dce4dd] bg-[#fffdf9] px-4 py-3 text-sm outline-none focus:border-[#187b5b]">
              <option value="">Tất cả loại địa điểm</option>
              {Object.entries(placeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#64766e]">{filtered.length} bài viết</p>
        <button
          type="button"
          onClick={openComposer}
          className="rounded-full bg-[#d98242] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#c36c30]"
        >
          {type === "roommate" ? "+ Đăng tin tìm roommate" : "+ Viết review"}
        </button>
      </div>
      {signInMessage && <p role="status" className="mt-3 text-right text-sm text-[#64766e]">{signInMessage}</p>}
      {success && <div className="mt-4"><Toast kind="success">{success}</Toast></div>}

      {filtered.length === 0 ? (
        <div className="mt-5"><Empty><p>Thử thay đổi từ khóa hoặc bộ lọc để xem thêm bài.</p></Empty></div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {filtered.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
              className="group overflow-hidden rounded-3xl border border-[#dfdfd2] bg-[#fffefa] shadow-sm transition hover:-translate-y-0.5 hover:border-[#9cbaa6] hover:shadow-md"
            >
              {post.images[0] && (
                <div className="relative h-52 bg-[#eef2ed]">
                  <Image
                    src={post.images[0].url}
                    alt={post.images[0].altText ?? post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              )}
              <article className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#e7f3ed] px-3 py-1 text-xs font-bold text-[#187b5b]">
                    {post.type === "roommate" ? roomLabels[post.roomType] : placeLabels[post.placeType]}
                  </span>
                  {post.type === "roommate" && post.district && <span className="text-xs text-[#819188]">{post.district}</span>}
                  {post.type === "review" && <span className="text-sm font-bold text-[#d98242]">{"★".repeat(post.rating)}{"☆".repeat(5 - post.rating)} <span className="text-[#64766e]">{post.rating}/5</span></span>}
                </div>
                <h2 className="mt-3 text-xl font-bold text-[#18352d] group-hover:text-[#187b5b]">{post.title}</h2>
                <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-[#64766e]">{post.content}</p>
                {post.type === "roommate" ? (
                  <div className="mt-5 flex items-end justify-between gap-3 border-t border-[#edf0eb] pt-4">
                    <p className="font-bold text-[#187b5b]">{money.format(post.rent)} đ <span className="text-xs font-normal text-[#819188]">/ tháng</span></p>
                    <p className="text-xs text-[#64766e]">{post.peopleNeeded} người cần tìm</p>
                  </div>
                ) : (
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#edf0eb] pt-4 text-sm">
                    <span className="font-semibold text-[#36564a]">{post.placeName}</span>
                    <span className="text-xs text-[#819188]">{post.address || "Chưa có địa chỉ"} · {post.counts.comments} bình luận</span>
                  </div>
                )}
              </article>
            </Link>
          ))}
        </div>
      )}
      {formOpen && (
        <PostForm
          type={type}
          onClose={() => setFormOpen(false)}
          onCreated={() => setSuccess(type === "roommate" ? "Đăng tin thành công." : "Gửi review thành công.")}
        />
      )}
      {verificationOpen && (
        <StudentVerificationForm
          initiallyOpen
          triggerLabel="Xác thực để đăng bài"
        />
      )}
    </>
  );
}
