import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["guest", "student", "admin"]);
export const domainTypeEnum = pgEnum("domain_type", ["student", "staff", "alumni", "other"]);
export const adminLevelEnum = pgEnum("admin_level", ["moderator", "super_admin"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "verified", "expired", "locked", "failed"]);
export const postTypeEnum = pgEnum("post_type", ["roommate", "review"]);
export const postStatusEnum = pgEnum("post_status", ["active", "hidden"]);
export const roomTypeEnum = pgEnum("room_type", ["private", "shared", "studio"]);
export const genderPreferenceEnum = pgEnum("gender_preference", ["male", "female", "any"]);
export const placeTypeEnum = pgEnum("place_type", ["cafe", "restaurant", "street_food", "photo", "other"]);
export const priceRangeEnum = pgEnum("price_range", ["low", "medium", "high"]);
export const commentStatusEnum = pgEnum("comment_status", ["active", "hidden"]);
export const reportReasonEnum = pgEnum("report_reason", ["spam", "abuse", "misinformation", "other"]);
export const reportStatusEnum = pgEnum("report_status", ["pending", "resolved_keep", "resolved_remove"]);
export const moderationResultEnum = pgEnum("moderation_result", ["approved", "rejected"]);

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const universities = pgTable("universities", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  shortName: varchar("short_name", { length: 50 }).notNull(),
  ...timestamps(),
});

export const universityDomains = pgTable(
  "university_domains",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    universityId: bigint("university_id", { mode: "number" })
      .notNull()
      .references(() => universities.id, { onDelete: "cascade" }),
    domain: varchar("domain", { length: 255 }).notNull().unique(),
    domainType: domainTypeEnum("domain_type").notNull().default("student"),
    ...timestamps(),
  },
  (table) => [uniqueIndex("university_domains_university_domain_idx").on(table.universityId, table.domain)],
);

export const users = pgTable(
  "users",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    googleId: varchar("google_id", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 254 }).notNull().unique(),
    universityEmail: varchar("university_email", { length: 254 }).unique(),
    name: varchar("name", { length: 200 }).notNull(),
    avatarUrl: text("avatar_url"),
    role: userRoleEnum("role").notNull().default("guest"),
    isVerified: boolean("is_verified").notNull().default(false),
    universityId: bigint("university_id", { mode: "number" }).references(() => universities.id),
    studentId: varchar("student_id", { length: 50 }),
    contact: varchar("contact", { length: 255 }),
    ...timestamps(),
  },
  (table) => [
    index("users_university_idx").on(table.universityId),
    check(
      "users_verified_check",
      sql`(${table.isVerified} = false AND ${table.universityId} IS NULL AND ${table.universityEmail} IS NULL)
        OR (${table.isVerified} = true AND ${table.universityId} IS NOT NULL AND ${table.universityEmail} IS NOT NULL)`,
    ),
  ],
);

export const studentProfiles = pgTable("student_profiles", {
  userId: bigint("user_id", { mode: "number" })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  major: varchar("major", { length: 200 }),
  cohort: varchar("cohort", { length: 50 }),
  ...timestamps(),
});

export const adminProfiles = pgTable("admin_profiles", {
  userId: bigint("user_id", { mode: "number" })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  adminLevel: adminLevelEnum("admin_level").notNull().default("moderator"),
  appointedAt: date("appointed_at"),
  ...timestamps(),
});

export const verificationRequests = pgTable(
  "verification_requests",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 254 }).notNull(),
    universityId: bigint("university_id", { mode: "number" })
      .notNull()
      .references(() => universities.id),
    otpHash: text("otp_hash").notNull(),
    otpExpiresAt: timestamp("otp_expires_at", { withTimezone: true }).notNull(),
    attempts: smallint("attempts").notNull().default(0),
    status: verificationStatusEnum("status").notNull().default("pending"),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("verification_requests_user_status_idx").on(table.userId, table.status),
    index("verification_requests_email_status_idx").on(table.email, table.status),
    index("verification_requests_expires_idx").on(table.otpExpiresAt),
    check("verification_requests_attempts_check", sql`${table.attempts} BETWEEN 0 AND 5`),
  ],
);

export const posts = pgTable(
  "posts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    authorId: bigint("author_id", { mode: "number" })
      .notNull()
      .references(() => users.id),
    postType: postTypeEnum("post_type").notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    content: text("content").notNull(),
    address: varchar("address", { length: 300 }),
    googleMapsUrl: text("google_maps_url"),
    status: postStatusEnum("status").notNull().default("active"),
    ...timestamps(),
  },
  (table) => [
    index("posts_type_status_created_idx").on(table.postType, table.status, table.createdAt),
    index("posts_author_created_idx").on(table.authorId, table.createdAt),
    check("posts_title_check", sql`length(trim(${table.title})) BETWEEN 1 AND 120`),
    check("posts_content_check", sql`length(trim(${table.content})) BETWEEN 1 AND 5000`),
  ],
);

export const roommatePosts = pgTable(
  "roommate_posts",
  {
    postId: bigint("post_id", { mode: "number" })
      .primaryKey()
      .references(() => posts.id, { onDelete: "cascade" }),
    rent: numeric("rent", { precision: 12, scale: 2 }).notNull(),
    peopleNeeded: smallint("people_needed").notNull(),
    genderPreference: genderPreferenceEnum("gender_preference").notNull().default("any"),
    areaM2: numeric("area_m2", { precision: 6, scale: 2 }),
    roommateRequirements: text("roommate_requirements"),
    roomType: roomTypeEnum("room_type").notNull(),
    district: varchar("district", { length: 100 }),
    amenities: jsonb("amenities").$type<string[]>().notNull().default([]),
    contactInfo: varchar("contact_info", { length: 255 }),
    ...timestamps(),
  },
  (table) => [
    check("roommate_posts_rent_check", sql`${table.rent} >= 0`),
    check("roommate_posts_people_check", sql`${table.peopleNeeded} BETWEEN 1 AND 20`),
  ],
);

export const reviewPosts = pgTable(
  "review_posts",
  {
    postId: bigint("post_id", { mode: "number" })
      .primaryKey()
      .references(() => posts.id, { onDelete: "cascade" }),
    placeName: varchar("place_name", { length: 200 }).notNull(),
    placeType: placeTypeEnum("place_type").notNull(),
    referencePrice: numeric("reference_price", { precision: 12, scale: 2 }),
    rating: smallint("rating").notNull(),
    experience: text("experience"),
    priceRange: priceRangeEnum("price_range").notNull(),
    wifiRating: smallint("wifi_rating"),
    atmosphereRating: smallint("atmosphere_rating"),
    serviceRating: smallint("service_rating"),
    ...timestamps(),
  },
  (table) => [
    check("review_posts_rating_check", sql`${table.rating} BETWEEN 1 AND 5`),
    check("review_posts_wifi_check", sql`${table.wifiRating} IS NULL OR ${table.wifiRating} BETWEEN 1 AND 5`),
    check("review_posts_atmosphere_check", sql`${table.atmosphereRating} IS NULL OR ${table.atmosphereRating} BETWEEN 1 AND 5`),
    check("review_posts_service_check", sql`${table.serviceRating} IS NULL OR ${table.serviceRating} BETWEEN 1 AND 5`),
  ],
);

export const postImages = pgTable(
  "post_images",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    postId: bigint("post_id", { mode: "number" })
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    sortOrder: smallint("sort_order").notNull().default(0),
    storageKey: text("storage_key").notNull(),
    url: text("url").notNull(),
    altText: varchar("alt_text", { length: 255 }),
    mimeType: varchar("mime_type", { length: 50 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("post_images_post_sort_idx").on(table.postId, table.sortOrder)],
);

export const comments = pgTable(
  "comments",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    postId: bigint("post_id", { mode: "number" })
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: bigint("author_id", { mode: "number" })
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    status: commentStatusEnum("status").notNull().default("active"),
    ...timestamps(),
  },
  (table) => [
    index("comments_post_created_idx").on(table.postId, table.createdAt),
    index("comments_author_created_idx").on(table.authorId, table.createdAt),
    check("comments_content_check", sql`length(trim(${table.content})) BETWEEN 1 AND 2000`),
  ],
);

export const votes = pgTable(
  "votes",
  {
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: bigint("post_id", { mode: "number" })
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    value: smallint("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.postId] }),
    check("votes_value_check", sql`${table.value} IN (-1, 1)`),
  ],
);

export const reports = pgTable(
  "reports",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    postId: bigint("post_id", { mode: "number" }).references(() => posts.id, { onDelete: "cascade" }),
    commentId: bigint("comment_id", { mode: "number" }).references(() => comments.id, { onDelete: "cascade" }),
    reporterId: bigint("reporter_id", { mode: "number" })
      .notNull()
      .references(() => users.id),
    reason: reportReasonEnum("reason").notNull(),
    description: text("description").notNull().default(""),
    status: reportStatusEnum("status").notNull().default("pending"),
    resolvedBy: bigint("resolved_by", { mode: "number" }).references(() => users.id),
    resolutionNote: text("resolution_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("reports_status_created_idx").on(table.status, table.createdAt),
    uniqueIndex("reports_post_reporter_unique").on(table.postId, table.reporterId),
    uniqueIndex("reports_comment_reporter_unique").on(table.commentId, table.reporterId),
    check(
      "reports_target_check",
      sql`((${table.postId} IS NOT NULL)::int + (${table.commentId} IS NOT NULL)::int) = 1`,
    ),
    check(
      "reports_resolution_check",
      sql`(${table.status} = 'pending' AND ${table.resolvedBy} IS NULL AND ${table.resolvedAt} IS NULL)
        OR (${table.status} <> 'pending' AND ${table.resolvedBy} IS NOT NULL AND ${table.resolvedAt} IS NOT NULL)`,
    ),
    check("reports_description_check", sql`length(${table.description}) <= 1000`),
  ],
);

export const moderationLogs = pgTable(
  "moderation_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    postId: bigint("post_id", { mode: "number" }),
    commentId: bigint("comment_id", { mode: "number" }),
    contentType: varchar("content_type", { length: 20 }).notNull(),
    result: moderationResultEnum("result").notNull(),
    needsReview: boolean("needs_review").notNull().default(false),
    labels: jsonb("labels").$type<Record<string, number | string[]>>().notNull().default({}),
    violationGroup: varchar("violation_group", { length: 50 }),
    confidence: numeric("confidence", { precision: 5, scale: 4 }),
    reason: text("reason"),
    policyVersion: varchar("policy_version", { length: 50 }).notNull(),
    modelVersion: varchar("model_version", { length: 100 }).notNull(),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("moderation_logs_post_idx").on(table.postId, table.scannedAt),
    index("moderation_logs_comment_idx").on(table.commentId, table.scannedAt),
    check(
      "moderation_logs_target_check",
      sql`((${table.postId} IS NOT NULL)::int + (${table.commentId} IS NOT NULL)::int) = 1`,
    ),
    check("moderation_logs_content_type_check", sql`${table.contentType} IN ('post', 'comment')`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("sessions_user_idx").on(table.userId), index("sessions_expires_idx").on(table.expiresAt)],
);
