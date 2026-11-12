"use client";

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

export default function PostList({ posts, type, user }: PostListProps) {
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
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
    const ceiling = maxPrice === "" ? null : Number(maxPrice);
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
        if (normalizedDistrict && !(post.district ?? "").toLocaleLowerCase("vi").includes(normalizedDistrict)) return false;
        if (ceiling !== null && post.rent > ceiling) return false;
        if (roomType && post.roomType !== roomType) return false;
      }
      if (type === "review" && post.type === "review" && placeType && post.placeType !== placeType) return false;
      return true;
    });
  }, [district, maxPrice, placeType, posts, query, roomType, type]);

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
      <div className="grid gap-3 rounded-3xl border border-[#e5e9e2] bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className="sm:col-span-2 lg:col-span-2">
          <span className="sr-only">Tìm theo từ khóa hoặc địa điểm</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo từ khóa hoặc địa điểm"
            className="w-full rounded-full border border-[#dce4dd] px-4 py-3 text-sm outline-none focus:border-[#187b5b]"
          />
        </label>
        {type === "roommate" ? (
          <>
            <label>
              <span className="sr-only">Khu vực hoặc quận</span>
              <input value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="Khu vực / quận" className="w-full rounded-full border border-[#dce4dd] px-4 py-3 text-sm outline-none focus:border-[#187b5b]" />
            </label>
            <label>
              <span className="sr-only">Giá thuê tối đa mỗi tháng</span>
              <input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Giá tối đa / tháng" className="w-full rounded-full border border-[#dce4dd] px-4 py-3 text-sm outline-none focus:border-[#187b5b]" />
            </label>
            <label className="lg:col-span-2">
              <span className="sr-only">Loại phòng</span>
              <select value={roomType} onChange={(event) => setRoomType(event.target.value)} className="w-full rounded-full border border-[#dce4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#187b5b]">
                <option value="">Tất cả loại phòng</option>
                {Object.entries(roomLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </>
        ) : (
          <label className="sm:col-span-2 lg:col-span-2">
            <span className="sr-only">Loại địa điểm</span>
            <select value={placeType} onChange={(event) => setPlaceType(event.target.value)} className="w-full rounded-full border border-[#dce4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#187b5b]">
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
              className="group overflow-hidden rounded-3xl border border-[#e5e9e2] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
