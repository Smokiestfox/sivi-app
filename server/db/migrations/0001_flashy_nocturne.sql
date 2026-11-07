ALTER TABLE "notifications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "post_tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "notifications" CASCADE;--> statement-breakpoint
DROP TABLE "post_tags" CASCADE;--> statement-breakpoint
ALTER TABLE "moderation_logs" DROP CONSTRAINT "moderation_logs_post_id_posts_id_fk";
--> statement-breakpoint
ALTER TABLE "moderation_logs" DROP CONSTRAINT "moderation_logs_comment_id_comments_id_fk";
--> statement-breakpoint
ALTER TABLE "moderation_logs" ADD COLUMN "needs_review" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "moderation_logs" SET "result" = 'approved', "needs_review" = true WHERE "result" = 'pending_review';
--> statement-breakpoint
ALTER TABLE "moderation_logs" ALTER COLUMN "result" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."moderation_result";--> statement-breakpoint
CREATE TYPE "public"."moderation_result" AS ENUM('approved', 'rejected');--> statement-breakpoint
ALTER TABLE "moderation_logs" ALTER COLUMN "result" SET DATA TYPE "public"."moderation_result" USING "result"::"public"."moderation_result";--> statement-breakpoint
DROP TYPE "public"."notification_type";