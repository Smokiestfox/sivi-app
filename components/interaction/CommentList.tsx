import type { ReactNode } from "react";
import type { CommentDto } from "../../server/comments/service";
import type { CommentFormUser } from "./CommentForm";
import { ReportButton } from "./ReportForm";

export type CommentListItem = Pick<CommentDto, "id" | "author" | "content" | "createdAt">;

export interface CommentListProps {
  /** Pass the items from listComments(), which already filters hidden content. */
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
  return (
    <section className="mt-6 rounded-3xl border border-[#e5e9e2] bg-white p-6 sm:p-8">
      <h2 className="text-2xl font-bold">Bình luận ({comments.length})</h2>
      {children}
      <div className="mt-6 divide-y divide-[#edf0eb]">
        {comments.map((comment) => {
          const createdAt = new Date(comment.createdAt);
          const hasValidDate = !Number.isNaN(createdAt.getTime());

          return (
            <article key={comment.id} className="py-5 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">
                  {comment.author.name.trim() || "Sinh viên"}{" "}
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
        {comments.length === 0 && (
          <p className="py-5 text-sm text-[#819188]">Chưa có bình luận nào.</p>
        )}
      </div>
    </section>
  );
}
