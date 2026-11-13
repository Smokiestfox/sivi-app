import type { ReactNode } from "react";
import type { CommentFormUser } from "./CommentForm";
import { ReportButton } from "./ReportForm";

/** Data supplied by the page through server/comments/service.ts. */
export interface CommentListItem {
  id: number;
  authorName: string;
  content: string;
  createdAt: Date | string;
  status: "active" | "hidden";
}

export interface CommentListProps {
  comments: readonly CommentListItem[];
  user?: CommentFormUser | null;
  /** Place CommentForm here to keep the layout from branch an. */
  children?: ReactNode;
}

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

export default function CommentList({ comments, user = null, children }: CommentListProps) {
  const visibleComments = comments.filter((comment) => comment.status === "active");

  return (
    <section className="mt-6 rounded-3xl border border-[#e5e9e2] bg-white p-6 sm:p-8">
      <h2 className="text-2xl font-bold">Bình luận ({visibleComments.length})</h2>
      {children}
      <div className="mt-6 divide-y divide-[#edf0eb]">
        {visibleComments.map((comment) => {
          const createdAt = new Date(comment.createdAt);
          const hasValidDate = !Number.isNaN(createdAt.getTime());

          return (
            <article key={comment.id} className="py-5 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">
                  {comment.authorName.trim() || "Sinh viên"}{" "}
                  {hasValidDate && (
                    <time
                      dateTime={createdAt.toISOString()}
                      className="ml-2 text-xs font-normal text-[#819188]"
                    >
                      {dateFormatter.format(createdAt)}
                    </time>
                  )}
                </p>
                <ReportButton commentId={comment.id} user={user} />
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#53685f]">
                {comment.content}
              </p>
            </article>
          );
        })}
        {visibleComments.length === 0 && (
          <p className="py-5 text-sm text-[#819188]">Chưa có bình luận nào.</p>
        )}
      </div>
    </section>
  );
}
