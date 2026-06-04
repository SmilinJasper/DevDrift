// =============================================================================
// DevDrift — Database Type Definitions
// =============================================================================
// Hand-written TypeScript types mirroring the Supabase PostgreSQL schema.
// These should stay in sync with supabase/migrations/*.sql.
// For auto-generated types, run: npx supabase gen types typescript
// =============================================================================

// ── Enum Unions ──────────────────────────────────────────────────────────────

/** Maps to `public.listing_type` enum: hackathon | job | internship */
export type ListingType = "hackathon" | "job" | "internship";

/** Maps to `public.interaction_kind` enum: view | save */
export type InteractionKind = "view" | "save";

// ── Table Row Types ──────────────────────────────────────────────────────────

/** Maps to `public.profiles` table */
export interface Profile {
  id: string; // UUID — FK → auth.users(id)
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  interests: string[]; // TEXT[] — free-form tags
  interest_embedding: number[] | null; // vector(384) — computed from interests
  location: string | null;
  website_url: string | null;
  created_at: string; // ISO 8601 timestamptz
  updated_at: string; // ISO 8601 timestamptz
}

/** Maps to `public.listings` table */
export interface Listing {
  id: string; // UUID
  created_by: string; // UUID → profiles(id)
  title: string;
  description: string | null;
  type: ListingType;
  tags: string[]; // TEXT[]
  location: string | null;
  is_remote: boolean;
  starts_at: string | null; // ISO 8601 timestamptz
  ends_at: string | null; // ISO 8601 timestamptz
  application_url: string | null;
  popularity_score: number;
  embedding: number[] | null; // vector(384)
  is_published: boolean;
  created_at: string; // ISO 8601 timestamptz
  updated_at: string; // ISO 8601 timestamptz
}

/** Maps to `public.interactions` table */
export interface Interaction {
  id: string; // UUID
  user_id: string; // UUID → profiles(id)
  listing_id: string; // UUID → listings(id)
  kind: InteractionKind;
  created_at: string; // ISO 8601 timestamptz
}

// ── RPC Return Types ─────────────────────────────────────────────────────────

/**
 * Row returned by the `recommend_listings_for_user` RPC.
 * Contains listing data + similarity score + recommendation metadata.
 */
export interface RecommendedListingRow {
  id: string;
  title: string;
  description: string | null;
  type: ListingType;
  tags: string[];
  location: string | null;
  is_remote: boolean;
  starts_at: string | null;
  ends_at: string | null;
  application_url: string | null;
  popularity_score: number;
  created_at: string;
  similarity: number; // Raw cosine similarity or tag-overlap score
  recommendation_source: "vector" | "tags"; // Which algorithm produced this result
}

/**
 * A recommended listing after time-decay has been applied in the API layer.
 * Extends the raw RPC result with the final computed score.
 */
export interface RecommendedListing extends RecommendedListingRow {
  final_score: number; // similarity * time_decay_multiplier
}

// ── Pagination Types ─────────────────────────────────────────────────────────

/** Cursor state for keyset-based infinite pagination */
export interface RecommendationCursor {
  score: number; // final_score of the last item
  id: string; // UUID of the last item (tiebreaker)
}

/** Shape of the paginated API response from GET /api/recommendations */
export interface RecommendationResponse {
  data: RecommendedListing[];
  pagination: {
    next_cursor: string | null; // Base64-encoded RecommendationCursor, null if no more
    has_more: boolean;
    page_size: number;
  };
}

/** State for Discovery page filters */
export interface DiscoveryFilters {
  type: ListingType | "all";
  location: "all" | "india" | "global";
}

/** Cursor state for keyset-based infinite pagination (Listings) */
export interface ListingCursor {
  popularity_score: number; // popularity_score of the last item
  id: string; // UUID of the last item (tiebreaker)
}

/** Shape of the paginated API response from GET /api/listings */
export interface ListingsResponse {
  data: Listing[];
  pagination: {
    next_cursor: string | null; // Base64-encoded ListingCursor, null if no more
    has_more: boolean;
    page_size: number;
  };
}
