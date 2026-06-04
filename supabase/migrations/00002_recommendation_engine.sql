-- =============================================================================
-- DevDrift — Recommendation Engine Migration
-- Migration: 00002_recommendation_engine.sql
-- Description: Adds interest_embedding to profiles and creates the
--              recommend_listings_for_user RPC for personalised recommendations
--              with cosine similarity search + tag-overlap fallback.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ADD INTEREST EMBEDDING COLUMN TO PROFILES
-- ─────────────────────────────────────────────────────────────────────────────

-- 384-dim vector matching the same embedding model used for listings.
-- Nullable: when NULL, the recommendation RPC falls back to tag-overlap scoring.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS interest_embedding vector(384);

COMMENT ON COLUMN public.profiles.interest_embedding
  IS '384-dimensional embedding vector computed from user interests. Used for cosine similarity recommendations. NULL triggers tag-overlap fallback.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RPC — recommend_listings_for_user
-- ─────────────────────────────────────────────────────────────────────────────
-- Returns personalised listing recommendations for a given user.
--
-- Strategy:
--   1. If the user has an interest_embedding → cosine similarity search
--   2. If not → tag-overlap scoring (|user.interests ∩ listing.tags|) + popularity
--
-- Excludes listings the user has already interacted with (viewed or saved).
-- Supports keyset pagination via (similarity_score, id) cursor.
--
-- Usage:
--   SELECT * FROM recommend_listings_for_user('user-uuid');
--   SELECT * FROM recommend_listings_for_user('user-uuid', 0.5, 20, 0.82, 'cursor-uuid');
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.recommend_listings_for_user(
  p_user_id          UUID,
  p_match_threshold  FLOAT  DEFAULT 0.5,
  p_limit            INT    DEFAULT 20,
  p_cursor_score     FLOAT  DEFAULT NULL,
  p_cursor_id        UUID   DEFAULT NULL
)
RETURNS TABLE (
  id                    UUID,
  title                 TEXT,
  description           TEXT,
  type                  public.listing_type,
  tags                  TEXT[],
  location              TEXT,
  is_remote             BOOLEAN,
  starts_at             TIMESTAMPTZ,
  ends_at               TIMESTAMPTZ,
  application_url       TEXT,
  popularity_score      FLOAT,
  created_at            TIMESTAMPTZ,
  similarity            FLOAT,
  recommendation_source TEXT
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_interest_embedding vector(384);
  v_user_interests     TEXT[];
BEGIN
  -- ── Fetch user profile data ──────────────────────────────────────────────
  SELECT p.interest_embedding, p.interests
  INTO   v_interest_embedding, v_user_interests
  FROM   public.profiles p
  WHERE  p.id = p_user_id;

  -- If user not found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- ── Branch: Vector similarity vs Tag-overlap ─────────────────────────────
  IF v_interest_embedding IS NOT NULL THEN
    -- STRATEGY 1: Cosine similarity search using pgvector
    RETURN QUERY
    SELECT
      l.id,
      l.title,
      l.description,
      l.type,
      l.tags,
      l.location,
      l.is_remote,
      l.starts_at,
      l.ends_at,
      l.application_url,
      l.popularity_score,
      l.created_at,
      (1 - (l.embedding <=> v_interest_embedding))::FLOAT AS similarity,
      'vector'::TEXT AS recommendation_source
    FROM public.listings l
    -- Exclude listings the user has already interacted with
    LEFT JOIN public.interactions i
      ON i.listing_id = l.id AND i.user_id = p_user_id
    WHERE
      l.is_published = true
      AND l.embedding IS NOT NULL
      AND i.id IS NULL                                          -- not interacted
      AND (1 - (l.embedding <=> v_interest_embedding)) > p_match_threshold
      -- Keyset pagination: skip rows before the cursor
      AND (
        p_cursor_score IS NULL
        OR (
          (1 - (l.embedding <=> v_interest_embedding)) < p_cursor_score
          OR (
            (1 - (l.embedding <=> v_interest_embedding)) = p_cursor_score
            AND l.id < p_cursor_id
          )
        )
      )
    ORDER BY
      (l.embedding <=> v_interest_embedding) ASC,  -- highest similarity first
      l.id DESC                                     -- stable tiebreaker
    LIMIT p_limit;

  ELSE
    -- STRATEGY 2: Tag-overlap fallback
    -- Score = (number of overlapping tags / max(user_tags, 1)) * 0.7 + normalized_popularity * 0.3
    RETURN QUERY
    SELECT
      l.id,
      l.title,
      l.description,
      l.type,
      l.tags,
      l.location,
      l.is_remote,
      l.starts_at,
      l.ends_at,
      l.application_url,
      l.popularity_score,
      l.created_at,
      (
        COALESCE(
          cardinality(
            ARRAY(SELECT unnest(v_user_interests) INTERSECT SELECT unnest(l.tags))
          )::FLOAT
          / GREATEST(cardinality(v_user_interests), 1)::FLOAT,
          0
        ) * 0.7
        + LEAST(l.popularity_score / GREATEST(
            (SELECT MAX(l2.popularity_score) FROM public.listings l2 WHERE l2.is_published = true),
            1
          ), 1.0) * 0.3
      )::FLOAT AS similarity,
      'tags'::TEXT AS recommendation_source
    FROM public.listings l
    LEFT JOIN public.interactions i
      ON i.listing_id = l.id AND i.user_id = p_user_id
    WHERE
      l.is_published = true
      AND i.id IS NULL
      -- Must share at least one tag, OR have non-zero popularity (discover new things)
      AND (
        v_user_interests = '{}'  -- if user has no interests, show popular listings
        OR l.tags && v_user_interests  -- array overlap operator
        OR l.popularity_score > 0
      )
      -- Keyset pagination
      AND (
        p_cursor_score IS NULL
        OR (
          (
            COALESCE(
              cardinality(
                ARRAY(SELECT unnest(v_user_interests) INTERSECT SELECT unnest(l.tags))
              )::FLOAT
              / GREATEST(cardinality(v_user_interests), 1)::FLOAT,
              0
            ) * 0.7
            + LEAST(l.popularity_score / GREATEST(
                (SELECT MAX(l2.popularity_score) FROM public.listings l2 WHERE l2.is_published = true),
                1
              ), 1.0) * 0.3
          ) < p_cursor_score
          OR (
            (
              COALESCE(
                cardinality(
                  ARRAY(SELECT unnest(v_user_interests) INTERSECT SELECT unnest(l.tags))
                )::FLOAT
                / GREATEST(cardinality(v_user_interests), 1)::FLOAT,
                0
              ) * 0.7
              + LEAST(l.popularity_score / GREATEST(
                  (SELECT MAX(l2.popularity_score) FROM public.listings l2 WHERE l2.is_published = true),
                  1
                ), 1.0) * 0.3
            ) = p_cursor_score
            AND l.id < p_cursor_id
          )
        )
      )
    ORDER BY similarity DESC, l.id DESC
    LIMIT p_limit;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.recommend_listings_for_user
  IS 'Returns personalised listing recommendations for a user via cosine similarity (when interest_embedding exists) or tag-overlap + popularity scoring (fallback). Excludes already-interacted listings. Supports keyset pagination.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. GRANTS
-- ─────────────────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.recommend_listings_for_user TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Done! Recommendation engine RPC created successfully.
-- ─────────────────────────────────────────────────────────────────────────────
