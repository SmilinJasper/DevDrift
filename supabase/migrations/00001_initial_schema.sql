-- =============================================================================
-- DevDrift — Supabase PostgreSQL Schema
-- Migration: 00001_initial_schema.sql
-- Description: Initializes the database with pgvector, profiles, listings,
--              and interactions tables. Includes RLS, indexes, and triggers.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable pgvector for semantic similarity search on listing embeddings
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Enable pg_trgm for fast text search / fuzzy matching (optional but useful)
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Enable moddatetime for automatic updated_at timestamp management
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CUSTOM TYPES
-- ─────────────────────────────────────────────────────────────────────────────

-- Listing category enum
CREATE TYPE public.listing_type AS ENUM (
  'hackathon',
  'job',
  'internship'
);

-- Interaction kind enum
CREATE TYPE public.interaction_kind AS ENUM (
  'view',
  'save'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  PROFILES                                                                │
-- │  Extends Supabase Auth users with app-specific metadata.                 │
-- └──────────────────────────────────────────────────────────────────────────┘

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL
                  CONSTRAINT username_length CHECK (char_length(username) BETWEEN 3 AND 40),
  full_name     TEXT,
  avatar_url    TEXT,
  bio           TEXT
                  CONSTRAINT bio_length CHECK (char_length(bio) <= 500),
  interests     TEXT[] DEFAULT '{}',          -- Array of string tags (e.g. {'AI', 'Web3', 'Rust'})
  location      TEXT,
  website_url   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE  public.profiles IS 'User profiles extending Supabase Auth. One row per authenticated user.';
COMMENT ON COLUMN public.profiles.interests IS 'Array of free-form string tags representing user interests (e.g. AI, Web3, Rust).';

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  LISTINGS                                                                │
-- │  Hackathons, jobs, and internships with vector embeddings for search.    │
-- └──────────────────────────────────────────────────────────────────────────┘

CREATE TABLE public.listings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Core fields
  title            TEXT NOT NULL
                     CONSTRAINT title_length CHECK (char_length(title) BETWEEN 1 AND 200),
  description      TEXT,
  type             public.listing_type NOT NULL,    -- 'hackathon' | 'job' | 'internship'
  tags             TEXT[] DEFAULT '{}',              -- Categorisation tags

  -- Location & dates
  location         TEXT,                              -- Free-form (e.g. "San Francisco, CA" or "Remote")
  is_remote        BOOLEAN DEFAULT false,
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  application_url  TEXT,

  -- Engagement
  popularity_score FLOAT DEFAULT 0
                     CONSTRAINT popularity_non_negative CHECK (popularity_score >= 0),

  -- Semantic search via pgvector — 384-dim embeddings (e.g. all-MiniLM-L6-v2)
  embedding        vector(384),

  -- Metadata
  is_published     BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Date sanity check
  CONSTRAINT valid_date_range CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

COMMENT ON TABLE  public.listings IS 'Opportunities: hackathons, jobs, and internships. Each listing can carry a 384-dim vector embedding for semantic search.';
COMMENT ON COLUMN public.listings.embedding IS '384-dimensional vector embedding (e.g. from all-MiniLM-L6-v2) used for cosine similarity search.';
COMMENT ON COLUMN public.listings.popularity_score IS 'Computed engagement score; higher = more popular. Updated via application logic or a cron.';

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  INTERACTIONS                                                            │
-- │  Tracks user saves and views on listings.                                │
-- └──────────────────────────────────────────────────────────────────────────┘

CREATE TABLE public.interactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id   UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  kind         public.interaction_kind NOT NULL,    -- 'view' | 'save'
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Prevent duplicate saves (views can repeat)
  CONSTRAINT unique_save_per_user_listing UNIQUE NULLS NOT DISTINCT (user_id, listing_id, kind)
);

COMMENT ON TABLE  public.interactions IS 'Records user interactions (views, saves) on listings for analytics and personalisation.';
COMMENT ON COLUMN public.interactions.kind IS 'Type of interaction: "view" (can repeat) or "save" (unique per user-listing pair).';

-- Note on the UNIQUE constraint above:
-- The unique constraint on (user_id, listing_id, kind) prevents a user from saving
-- the same listing twice. For views, you may want to track only the *latest* view
-- per user-listing pair. An alternative approach would be to use an UPSERT when
-- recording views, updating created_at on conflict.

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Profiles
CREATE INDEX idx_profiles_username     ON public.profiles USING btree (username);
CREATE INDEX idx_profiles_interests    ON public.profiles USING gin (interests);

-- Listings
CREATE INDEX idx_listings_type         ON public.listings USING btree (type);
CREATE INDEX idx_listings_created_by   ON public.listings USING btree (created_by);
CREATE INDEX idx_listings_location     ON public.listings USING btree (location);
CREATE INDEX idx_listings_starts_at    ON public.listings USING btree (starts_at);
CREATE INDEX idx_listings_popularity   ON public.listings USING btree (popularity_score DESC);
CREATE INDEX idx_listings_tags         ON public.listings USING gin (tags);
CREATE INDEX idx_listings_is_published ON public.listings USING btree (is_published) WHERE is_published = true;

-- pgvector cosine similarity index (IVFFlat — good balance of speed and recall)
-- Adjust `lists` parameter based on expected dataset size. Start with sqrt(row_count).
-- For small datasets (< 10k rows), consider using HNSW instead for better recall.
CREATE INDEX idx_listings_embedding ON public.listings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Interactions
CREATE INDEX idx_interactions_user_id    ON public.interactions USING btree (user_id);
CREATE INDEX idx_interactions_listing_id ON public.interactions USING btree (listing_id);
CREATE INDEX idx_interactions_kind       ON public.interactions USING btree (kind);
CREATE INDEX idx_interactions_created_at ON public.interactions USING btree (created_at DESC);

-- Composite index for fast "did this user save this listing?" lookups
CREATE INDEX idx_interactions_user_listing_kind
  ON public.interactions USING btree (user_id, listing_id, kind);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. AUTOMATIC TIMESTAMP TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Auto-update updated_at on profiles
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- Auto-update updated_at on listings
CREATE TRIGGER handle_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. HELPER FUNCTION — Profile auto-creation on signup
-- ─────────────────────────────────────────────────────────────────────────────

-- Automatically create a profile row when a new user signs up via Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', 'user_' || LEFT(NEW.id::text, 8)),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. HELPER FUNCTION — Semantic search (cosine similarity)
-- ─────────────────────────────────────────────────────────────────────────────

-- Find the most similar listings to a given embedding vector.
-- Usage: SELECT * FROM match_listings('[0.1, 0.2, ...]'::vector(384), 0.78, 10);
CREATE OR REPLACE FUNCTION public.match_listings(
  query_embedding vector(384),
  match_threshold FLOAT DEFAULT 0.75,
  match_count     INT DEFAULT 10
)
RETURNS TABLE (
  id               UUID,
  title            TEXT,
  description      TEXT,
  type             public.listing_type,
  location         TEXT,
  popularity_score FLOAT,
  similarity       FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    l.id,
    l.title,
    l.description,
    l.type,
    l.location,
    l.popularity_score,
    1 - (l.embedding <=> query_embedding) AS similarity
  FROM public.listings l
  WHERE
    l.is_published = true
    AND l.embedding IS NOT NULL
    AND 1 - (l.embedding <=> query_embedding) > match_threshold
  ORDER BY l.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON FUNCTION public.match_listings IS 'Semantic search: returns the top-N published listings most similar to the given embedding vector, above the similarity threshold.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all public tables
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- ── Profiles ─────────────────────────────────────────────────────────────────

-- Anyone can read profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can only delete their own profile (cascades from auth.users)
CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- ── Listings ─────────────────────────────────────────────────────────────────

-- Anyone can read published listings
CREATE POLICY "Published listings are viewable by everyone"
  ON public.listings FOR SELECT
  USING (is_published = true);

-- Authenticated users can create listings
CREATE POLICY "Authenticated users can create listings"
  ON public.listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Listing owners can update their own listings
CREATE POLICY "Users can update their own listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Listing owners can delete their own listings
CREATE POLICY "Users can delete their own listings"
  ON public.listings FOR DELETE
  USING (auth.uid() = created_by);

-- ── Interactions ─────────────────────────────────────────────────────────────

-- Users can read their own interactions
CREATE POLICY "Users can view their own interactions"
  ON public.interactions FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can create interactions (views/saves)
CREATE POLICY "Authenticated users can create interactions"
  ON public.interactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own interactions (unsave)
CREATE POLICY "Users can delete their own interactions"
  ON public.interactions FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. GRANTS — Ensure Supabase roles have appropriate access
-- ─────────────────────────────────────────────────────────────────────────────

-- Allow the anon and authenticated roles to use the public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Profiles
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Listings
GRANT SELECT ON public.listings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.listings TO authenticated;

-- Interactions
GRANT SELECT, INSERT, DELETE ON public.interactions TO authenticated;

-- Functions
GRANT EXECUTE ON FUNCTION public.match_listings TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Done! Schema initialized successfully.
-- ─────────────────────────────────────────────────────────────────────────────
