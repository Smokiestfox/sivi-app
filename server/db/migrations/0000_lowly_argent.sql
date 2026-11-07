CREATE TYPE "public"."admin_level" AS ENUM('moderator', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."comment_status" AS ENUM('active', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."domain_type" AS ENUM('student', 'staff', 'alumni', 'other');--> statement-breakpoint
CREATE TYPE "public"."gender_preference" AS ENUM('male', 'female', 'any');--> statement-breakpoint
CREATE TYPE "public"."moderation_result" AS ENUM('approved', 'pending_review', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('info', 'warning', 'success', 'error');--> statement-breakpoint
CREATE TYPE "public"."place_type" AS ENUM('cafe', 'restaurant', 'street_food', 'photo', 'other');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('active', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('roommate', 'review');--> statement-breakpoint
CREATE TYPE "public"."price_range" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('spam', 'abuse', 'misinformation', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'resolved_keep', 'resolved_remove');--> statement-breakpoint
CREATE TYPE "public"."room_type" AS ENUM('private', 'shared', 'studio');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('guest', 'student', 'admin');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'expired', 'locked', 'failed');--> statement-breakpoint
CREATE TABLE "admin_profiles" (
	"user_id" bigint PRIMARY KEY NOT NULL,
	"admin_level" "admin_level" DEFAULT 'moderator' NOT NULL,
	"appointed_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" bigint NOT NULL,
	"author_id" bigint NOT NULL,
	"content" text NOT NULL,
	"status" "comment_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comments_content_check" CHECK (length(trim("comments"."content")) BETWEEN 1 AND 2000)
);
--> statement-breakpoint
CREATE TABLE "moderation_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" bigint,
	"comment_id" bigint,
	"content_type" varchar(20) NOT NULL,
	"result" "moderation_result" NOT NULL,
	"labels" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"violation_group" varchar(50),
	"confidence" numeric(5, 4),
	"reason" text,
	"policy_version" varchar(50) NOT NULL,
	"model_version" varchar(100) NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_logs_target_check" CHECK ((("moderation_logs"."post_id" IS NOT NULL)::int + ("moderation_logs"."comment_id" IS NOT NULL)::int) = 1),
	CONSTRAINT "moderation_logs_content_type_check" CHECK ("moderation_logs"."content_type" IN ('post', 'comment'))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"type" "notification_type" DEFAULT 'info' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_images" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" bigint NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"storage_key" text NOT NULL,
	"url" text NOT NULL,
	"alt_text" varchar(255),
	"mime_type" varchar(50) NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"post_id" bigint NOT NULL,
	"tag" varchar(40) NOT NULL,
	CONSTRAINT "post_tags_post_id_tag_pk" PRIMARY KEY("post_id","tag")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"author_id" bigint NOT NULL,
	"post_type" "post_type" NOT NULL,
	"title" varchar(120) NOT NULL,
	"content" text NOT NULL,
	"address" varchar(300),
	"google_maps_url" text,
	"status" "post_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_title_check" CHECK (length(trim("posts"."title")) BETWEEN 1 AND 120),
	CONSTRAINT "posts_content_check" CHECK (length(trim("posts"."content")) BETWEEN 1 AND 5000)
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" bigint,
	"comment_id" bigint,
	"reporter_id" bigint NOT NULL,
	"reason" "report_reason" NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"resolved_by" bigint,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "reports_target_check" CHECK ((("reports"."post_id" IS NOT NULL)::int + ("reports"."comment_id" IS NOT NULL)::int) = 1),
	CONSTRAINT "reports_resolution_check" CHECK (("reports"."status" = 'pending' AND "reports"."resolved_by" IS NULL AND "reports"."resolved_at" IS NULL)
        OR ("reports"."status" <> 'pending' AND "reports"."resolved_by" IS NOT NULL AND "reports"."resolved_at" IS NOT NULL)),
	CONSTRAINT "reports_description_check" CHECK (length("reports"."description") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "review_posts" (
	"post_id" bigint PRIMARY KEY NOT NULL,
	"place_name" varchar(200) NOT NULL,
	"place_type" "place_type" NOT NULL,
	"reference_price" numeric(12, 2),
	"rating" smallint NOT NULL,
	"experience" text,
	"price_range" "price_range" NOT NULL,
	"wifi_rating" smallint,
	"atmosphere_rating" smallint,
	"service_rating" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_posts_rating_check" CHECK ("review_posts"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "review_posts_wifi_check" CHECK ("review_posts"."wifi_rating" IS NULL OR "review_posts"."wifi_rating" BETWEEN 1 AND 5),
	CONSTRAINT "review_posts_atmosphere_check" CHECK ("review_posts"."atmosphere_rating" IS NULL OR "review_posts"."atmosphere_rating" BETWEEN 1 AND 5),
	CONSTRAINT "review_posts_service_check" CHECK ("review_posts"."service_rating" IS NULL OR "review_posts"."service_rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "roommate_posts" (
	"post_id" bigint PRIMARY KEY NOT NULL,
	"rent" numeric(12, 2) NOT NULL,
	"people_needed" smallint NOT NULL,
	"gender_preference" "gender_preference" DEFAULT 'any' NOT NULL,
	"area_m2" numeric(6, 2),
	"roommate_requirements" text,
	"room_type" "room_type" NOT NULL,
	"district" varchar(100),
	"amenities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contact_info" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roommate_posts_rent_check" CHECK ("roommate_posts"."rent" >= 0),
	CONSTRAINT "roommate_posts_people_check" CHECK ("roommate_posts"."people_needed" BETWEEN 1 AND 20)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"user_id" bigint PRIMARY KEY NOT NULL,
	"major" varchar(200),
	"cohort" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "universities" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"short_name" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "university_domains" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"university_id" bigint NOT NULL,
	"domain" varchar(255) NOT NULL,
	"domain_type" "domain_type" DEFAULT 'student' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "university_domains_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"google_id" varchar(255) NOT NULL,
	"email" varchar(254) NOT NULL,
	"university_email" varchar(254),
	"name" varchar(200) NOT NULL,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'guest' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"university_id" bigint,
	"student_id" varchar(50),
	"contact" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_university_email_unique" UNIQUE("university_email"),
	CONSTRAINT "users_verified_check" CHECK (("users"."is_verified" = false AND "users"."university_id" IS NULL AND "users"."university_email" IS NULL)
        OR ("users"."is_verified" = true AND "users"."university_id" IS NOT NULL AND "users"."university_email" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "verification_requests" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"email" varchar(254) NOT NULL,
	"university_id" bigint NOT NULL,
	"otp_hash" text NOT NULL,
	"otp_expires_at" timestamp with time zone NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_requests_attempts_check" CHECK ("verification_requests"."attempts" BETWEEN 0 AND 5)
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"user_id" bigint NOT NULL,
	"post_id" bigint NOT NULL,
	"value" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votes_user_id_post_id_pk" PRIMARY KEY("user_id","post_id"),
	CONSTRAINT "votes_value_check" CHECK ("votes"."value" IN (-1, 1))
);
--> statement-breakpoint
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_images" ADD CONSTRAINT "post_images_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_posts" ADD CONSTRAINT "review_posts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roommate_posts" ADD CONSTRAINT "roommate_posts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "university_domains" ADD CONSTRAINT "university_domains_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_post_created_idx" ON "comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_author_created_idx" ON "comments" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "moderation_logs_post_idx" ON "moderation_logs" USING btree ("post_id","scanned_at");--> statement-breakpoint
CREATE INDEX "moderation_logs_comment_idx" ON "moderation_logs" USING btree ("comment_id","scanned_at");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "post_images_post_sort_idx" ON "post_images" USING btree ("post_id","sort_order");--> statement-breakpoint
CREATE INDEX "posts_type_status_created_idx" ON "posts" USING btree ("post_type","status","created_at");--> statement-breakpoint
CREATE INDEX "posts_author_created_idx" ON "posts" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "reports_status_created_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_post_reporter_unique" ON "reports" USING btree ("post_id","reporter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_comment_reporter_unique" ON "reports" USING btree ("comment_id","reporter_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "university_domains_university_domain_idx" ON "university_domains" USING btree ("university_id","domain");--> statement-breakpoint
CREATE INDEX "users_university_idx" ON "users" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "verification_requests_user_status_idx" ON "verification_requests" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "verification_requests_email_status_idx" ON "verification_requests" USING btree ("email","status");--> statement-breakpoint
CREATE INDEX "verification_requests_expires_idx" ON "verification_requests" USING btree ("otp_expires_at");