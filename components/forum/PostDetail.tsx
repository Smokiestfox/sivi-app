import { StarRating } from "@/components/ui/StarRating";
import PostOwnerActions from "./PostOwnerActions";
import PostGallery from "./PostGallery";
import Link from "next/link";
import type { PostDto } from "@/server/posts/service";
import type { CurrentUser } from "@/server/auth/current-user";
import CommentForm from "@/components/interaction/CommentForm";
import CommentList, { type CommentListItem } from "@/components/interaction/CommentList";
import { ReportButton } from "@/components/interaction/ReportForm";
import VoteControls from "./VoteControls";

const money = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const roomLabels = { private: "Phòng riêng", shared: "Ở ghép", studio: "Studio" } as const;
const placeLabels = {
  cafe: "Cafe",
  restaurant: "Quán ăn",
  street_food: "Ăn vặt / đường phố",
  photo: "Photo",
  other: "Khác",
} as const;

type PostDetailProps = {
  post: PostDto;
  comments: CommentListItem[];
  user: CurrentUser | null;
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeZone: "Asia/Ho_Chi_Minh" });

export default function PostDetail({ post, comments, user }: PostDetailProps) {
  const createdAt = new Date(post.createdAt);
  const viewer = user ? { id: user.id, role: user.role, isVerified: user.isVerified } : null;

  return (
    <article className="post-detail">
      <Link href={post.type === "roommate" ? "/" : "/review"} className="text-sm font-semibold text-[#187b5b] hover:underline">
        ← {post.type === "roommate" ? "Tìm chỗ ở" : "Review địa điểm"}
      </Link>
      <div className="post-layout">
      <div className="post-main-card">
        <PostGallery images={post.images} title={post.title} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#e7f3ed] px-3 py-1 text-xs font-bold text-[#187b5b]">
            {post.type === "roommate" ? roomLabels[post.roomType] : placeLabels[post.placeType]}
          </span>
          <span className="text-sm text-[#819188]">Đăng bởi {post.author.name}</span>
          <time className="text-sm text-[#819188]" dateTime={post.createdAt}>
            {Number.isNaN(createdAt.getTime()) ? "" : dateFormatter.format(createdAt)}
          </time>
        </div>
        <h1 className="mt-4 text-2xl font-bold leading-snug tracking-tight text-[#18352d] sm:text-4xl">{post.title}</h1>
        {user?.id === post.author.id && user.role === "student" && user.isVerified && <PostOwnerActions post={post} />}
        {post.type === "review" && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StarRating value={post.rating} />
            <span className="text-sm text-[#64766e]">{post.placeName}</span>
          </div>
        )}


        <h2 className="mt-7 text-lg font-bold text-[#18352d]">Mô tả &amp; trải nghiệm</h2>
        <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#36564a]">{post.content}</div>





        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#edf0eb] pt-5">
          {post.type === "review" ? (
            <VoteControls
              postId={post.id}
              user={viewer}
              upvotes={post.counts.upvotes}
              downvotes={post.counts.downvotes}
              currentUserVote={post.currentUserVote}
            />
          ) : <span className="text-sm text-[#819188]">{post.peopleNeeded} người cần tìm · {post.counts.comments} bình luận</span>}
          <ReportButton postId={post.id} user={viewer} />
        </div>
      </div>

      <aside className="post-sidebar">
        <div className="post-summary">
          <p className="text-xs font-bold uppercase tracking-wider text-[#64766e]">Thông tin {post.type === "roommate" ? "chỗ ở" : "địa điểm"}</p>
          <h2 className="mt-3 text-xl font-bold text-[#18352d]">{post.type === "roommate" ? `${money.format(post.rent)} đ / tháng` : post.placeName}</h2>
        {post.type === "roommate" ? (
          <dl className="mt-5 grid gap-5">
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#819188]">Loại phòng</dt><dd className="mt-1 font-semibold text-[#18352d]">{roomLabels[post.roomType]}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#819188]">Số người cần tìm</dt><dd className="mt-1 font-semibold text-[#18352d]">{post.peopleNeeded}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#819188]">Khu vực / quận</dt><dd className="mt-1 font-semibold text-[#18352d]">{[post.address, post.district].filter(Boolean).join(" · ") || "Chưa cung cấp"}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#819188]">Ưu tiên giới tính</dt><dd className="mt-1 font-semibold text-[#18352d]">{post.genderPreference === "any" ? "Không yêu cầu" : post.genderPreference === "male" ? "Nam" : "Nữ"}</dd></div>
            {post.areaM2 !== null && <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#819188]">Diện tích</dt><dd className="mt-1 font-semibold text-[#18352d]">{post.areaM2} m²</dd></div>}
            {post.contactInfo && <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#819188]">Liên hệ</dt><dd className="mt-1 break-words font-semibold text-[#18352d]">{post.contactInfo}</dd></div>}
            {post.roommateRequirements && <div className=""><dt className="text-xs font-semibold uppercase tracking-wide text-[#819188]">Yêu cầu roommate</dt><dd className="mt-1 whitespace-pre-wrap text-[#36564a]">{post.roommateRequirements}</dd></div>}
            {post.amenities.length > 0 && <div className=""><dt className="text-xs font-semibold uppercase tracking-wide text-[#819188]">Tiện ích</dt><dd className="mt-2 flex flex-wrap gap-2">{post.amenities.map((amenity) => <span key={amenity} className="rounded-full bg-white px-3 py-1 text-sm text-[#36564a]">{amenity}</span>)}</dd></div>}
          </dl>
        ) : (
          <dl className="mt-5 grid gap-5">
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#819188]">Địa điểm</dt><dd className="mt-1 font-semibold text-[#18352d]">{post.placeName}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#819188]">Loại địa điểm</dt><dd className="mt-1 font-semibold text-[#18352d]">{placeLabels[post.placeType]}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#819188]">Địa chỉ</dt><dd className="mt-1 font-semibold text-[#18352d]">{post.address || "Chưa cung cấp"}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#819188]">Mức giá</dt><dd className="mt-1 font-semibold text-[#18352d]">{post.priceRange === "low" ? "Bình dân" : post.priceRange === "medium" ? "Trung bình" : "Cao"}{post.referencePrice !== null ? ` · khoảng ${money.format(post.referencePrice)} đ` : ""}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#819188]">Wifi</dt><dd className="mt-1 font-semibold text-[#18352d]"><StarRating value={post.wifiRating} /></dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#819188]">Không gian</dt><dd className="mt-1 font-semibold text-[#18352d]"><StarRating value={post.atmosphereRating} /></dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#819188]">Phục vụ</dt><dd className="mt-1 font-semibold text-[#18352d]"><StarRating value={post.serviceRating} /></dd></div>
            {post.experience && <div className=""><dt className="text-xs font-semibold uppercase tracking-wide text-[#819188]">Trải nghiệm</dt><dd className="mt-1 whitespace-pre-wrap text-[#36564a]">{post.experience}</dd></div>}
          </dl>
        )}
          <a href="#post-comments" className="mt-6 block rounded-xl bg-[#187b5b] px-4 py-3 text-center text-sm font-bold text-white hover:bg-[#126348]">Trao đổi trong bình luận</a>
        </div>
        <div className="mt-4 rounded-2xl border border-[#dddccf] bg-[#e8efe7] p-5 text-sm leading-6 text-[#36564a]">
          {post.type === "roommate" ? "Nên xem phòng trực tiếp và kiểm tra thông tin trước khi đặt cọc." : "Giá và trải nghiệm có thể thay đổi theo thời điểm. Bạn có thể chia sẻ cập nhật ở phần bình luận."}
        </div>
      </aside>
      </div>

      <CommentList comments={comments} user={viewer}>
        <CommentForm postId={post.id} user={viewer} postStatus="active" />
      </CommentList>
    </article>
  );
}
