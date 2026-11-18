ALTER TABLE "review_posts" DROP CONSTRAINT "review_posts_rating_check";--> statement-breakpoint
ALTER TABLE "review_posts" DROP CONSTRAINT "review_posts_wifi_check";--> statement-breakpoint
ALTER TABLE "review_posts" DROP CONSTRAINT "review_posts_atmosphere_check";--> statement-breakpoint
ALTER TABLE "review_posts" DROP CONSTRAINT "review_posts_service_check";--> statement-breakpoint
ALTER TABLE "review_posts" ALTER COLUMN "rating" SET DATA TYPE numeric(2, 1);--> statement-breakpoint
ALTER TABLE "review_posts" ALTER COLUMN "wifi_rating" SET DATA TYPE numeric(2, 1);--> statement-breakpoint
ALTER TABLE "review_posts" ALTER COLUMN "atmosphere_rating" SET DATA TYPE numeric(2, 1);--> statement-breakpoint
ALTER TABLE "review_posts" ALTER COLUMN "service_rating" SET DATA TYPE numeric(2, 1);--> statement-breakpoint
ALTER TABLE "review_posts" ADD CONSTRAINT "review_posts_rating_check" CHECK (("review_posts"."rating" BETWEEN 0.5 AND 5 AND "review_posts"."rating" * 2 = trunc("review_posts"."rating" * 2)));--> statement-breakpoint
ALTER TABLE "review_posts" ADD CONSTRAINT "review_posts_wifi_check" CHECK ("review_posts"."wifi_rating" IS NULL OR ("review_posts"."wifi_rating" BETWEEN 0.5 AND 5 AND "review_posts"."wifi_rating" * 2 = trunc("review_posts"."wifi_rating" * 2)));--> statement-breakpoint
ALTER TABLE "review_posts" ADD CONSTRAINT "review_posts_atmosphere_check" CHECK ("review_posts"."atmosphere_rating" IS NULL OR ("review_posts"."atmosphere_rating" BETWEEN 0.5 AND 5 AND "review_posts"."atmosphere_rating" * 2 = trunc("review_posts"."atmosphere_rating" * 2)));--> statement-breakpoint
ALTER TABLE "review_posts" ADD CONSTRAINT "review_posts_service_check" CHECK ("review_posts"."service_rating" IS NULL OR ("review_posts"."service_rating" BETWEEN 0.5 AND 5 AND "review_posts"."service_rating" * 2 = trunc("review_posts"."service_rating" * 2)));