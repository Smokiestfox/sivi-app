CREATE TABLE IF NOT EXISTS universities (
  id text PRIMARY KEY,
  name text NOT NULL,
  domain text NOT NULL UNIQUE
);

INSERT INTO universities (id, name, domain) VALUES
  ('uit', 'ĐH Công nghệ Thông tin (UIT)', '@gm.uit.edu.vn'),
  ('hcmut', 'ĐH Bách Khoa (HCMUT)', '@hcmut.edu.vn'),
  ('iu', 'ĐH Quốc tế (IU)', '@student.hcmiu.edu.vn'),
  ('uel', 'ĐH Kinh tế - Luật (UEL)', '@st.uel.edu.vn'),
  ('ussh-hcm', 'ĐH KHXH&NV (USSH-HCM)', '@hcmussh.edu.vn')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, domain = EXCLUDED.domain;

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  google_id text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  avatar text,
  role text NOT NULL DEFAULT 'guest' CHECK (role IN ('guest', 'student', 'admin')),
  is_verified boolean NOT NULL DEFAULT false,
  university_id text REFERENCES universities(id),
  university_email text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((is_verified AND university_id IS NOT NULL AND university_email IS NOT NULL)
    OR (NOT is_verified AND university_id IS NULL AND university_email IS NULL))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS otp_verifications (
  email text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  university_id text NOT NULL REFERENCES universities(id),
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  expires_at timestamptz NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);

CREATE TABLE IF NOT EXISTS posts (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  post_type text NOT NULL CHECK (post_type IN ('roommate', 'review')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending_review', 'rejected', 'hidden')),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
  content text NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 5000),
  images jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(images) = 'array'),
  tags jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(tags) = 'array'),
  price integer CHECK (price IS NULL OR price >= 0),
  area text,
  district text,
  room_type text CHECK (room_type IS NULL OR room_type IN ('private', 'shared', 'studio')),
  people_needed integer CHECK (people_needed IS NULL OR people_needed BETWEEN 1 AND 20),
  amenities jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(amenities) = 'array'),
  gender_preference text CHECK (gender_preference IS NULL OR gender_preference IN ('male', 'female', 'any')),
  contact_info text,
  place_name text,
  place_address text,
  place_type text CHECK (place_type IS NULL OR place_type IN ('cafe', 'restaurant', 'street_food', 'other')),
  rating integer CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  price_range text CHECK (price_range IS NULL OR price_range IN ('low', 'medium', 'high')),
  wifi_rating integer CHECK (wifi_rating IS NULL OR wifi_rating BETWEEN 1 AND 5),
  atmosphere_rating integer CHECK (atmosphere_rating IS NULL OR atmosphere_rating BETWEEN 1 AND 5),
  service_rating integer CHECK (service_rating IS NULL OR service_rating BETWEEN 1 AND 5),
  moderation_result jsonb NOT NULL,
  upvotes integer NOT NULL DEFAULT 0 CHECK (upvotes >= 0),
  downvotes integer NOT NULL DEFAULT 0 CHECK (downvotes >= 0),
  comment_count integer NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
  report_count integer NOT NULL DEFAULT 0 CHECK (report_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (post_type = 'roommate' AND price IS NOT NULL AND area IS NOT NULL
      AND district IS NOT NULL AND room_type IS NOT NULL AND people_needed IS NOT NULL
      AND gender_preference IS NOT NULL AND contact_info IS NOT NULL
      AND place_name IS NULL AND place_type IS NULL AND rating IS NULL)
    OR
    (post_type = 'review' AND place_name IS NOT NULL AND place_type IS NOT NULL
      AND rating IS NOT NULL AND price_range IS NOT NULL
      AND price IS NULL AND room_type IS NULL AND people_needed IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS posts_public_idx ON posts(post_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_user_idx ON posts(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
  id text PRIMARY KEY,
  post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id),
  content text NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  moderation_result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_post_idx ON comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS comments_user_idx ON comments(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS votes (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id text PRIMARY KEY,
  post_id text REFERENCES posts(id) ON DELETE CASCADE,
  comment_id text REFERENCES comments(id) ON DELETE CASCADE,
  reporter_id text NOT NULL REFERENCES users(id),
  reason text NOT NULL CHECK (reason IN ('spam', 'abuse', 'misinformation', 'other')),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 1000),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolved_keep', 'resolved_remove')),
  resolved_by text REFERENCES users(id),
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK ((post_id IS NOT NULL)::integer + (comment_id IS NOT NULL)::integer = 1),
  CHECK ((status = 'pending' AND resolved_by IS NULL AND resolved_at IS NULL)
    OR (status <> 'pending' AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS reports_post_reporter_unique
  ON reports(post_id, reporter_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reports_comment_reporter_unique
  ON reports(comment_id, reporter_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reports_pending_idx ON reports(status, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('info', 'warning', 'success', 'error')),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
