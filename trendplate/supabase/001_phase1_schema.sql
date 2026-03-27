-- raw_trends: stores raw TikTok video data before processing
CREATE TABLE IF NOT EXISTS raw_trends (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of      DATE NOT NULL,
  hashtag      TEXT,
  video_id     TEXT,
  title        TEXT,
  description  TEXT,
  view_count   BIGINT,
  like_count   BIGINT,
  share_count  BIGINT,
  author       TEXT,
  video_url    TEXT,
  scraped_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (week_of, video_id)
);

-- recipes: stores Claude-generated recipes
CREATE TABLE IF NOT EXISTS recipes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of          DATE NOT NULL,
  rank             INT CHECK (rank BETWEEN 1 AND 5),
  title            TEXT,
  description      TEXT,
  ingredients      JSONB DEFAULT '[]',
  steps            JSONB DEFAULT '[]',
  macros           JSONB DEFAULT '{}',
  cook_time_mins   INT,
  servings         INT DEFAULT 2,
  estimated_cost   NUMERIC(6, 2),
  tiktok_views     BIGINT,
  source_hashtag   TEXT,
  status           TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (week_of, rank)
);

-- Enable Row Level Security
ALTER TABLE raw_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Published recipes readable by authenticated users
CREATE POLICY "Published recipes readable by authenticated users"
  ON recipes FOR SELECT
  TO authenticated
  USING (status = 'published');

-- Service role can write to raw_trends (enforced via service key usage, no explicit policy needed)
-- Service role bypasses RLS by default
