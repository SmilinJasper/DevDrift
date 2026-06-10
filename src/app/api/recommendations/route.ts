import { type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  RecommendedListingRow,
  RecommendedListing,
  RecommendationCursor,
  RecommendationResponse,
  ListingType,
} from "@/types/database";
import {
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  UUID_REGEX,
  encodeCursor,
  decodeCursor,
} from "@/lib/utils/pagination";

// ── Constants ────────────────────────────────────────────────────────────────

/** Exponential decay rate. λ = 0.01 → half-life ≈ 69 days (gentle decay). */
const DECAY_LAMBDA = 0.01;

/** Default similarity threshold. */
const DEFAULT_THRESHOLD = 0.5;

/** Valid listing type values for filtering. */
const VALID_TYPES: ReadonlySet<string> = new Set([
  "hackathon",
  "job",
  "internship",
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Apply exponential time-decay to a similarity score based on listing age.
 *
 * formula: final_score = similarity × e^(-λ × days_since_created)
 *
 * This gently favours newer listings while preserving relevance ordering
 * for highly similar results regardless of age.
 */
function applyTimeDecay(
  similarity: number,
  createdAt: string,
  now: number
): number {
  const daysSinceCreated =
    (now - new Date(createdAt).getTime()) / 86_400_000; // ms → days
  const decayMultiplier = Math.exp(-DECAY_LAMBDA * Math.max(daysSinceCreated, 0));
  return similarity * decayMultiplier;
}

// ── Route Handler ────────────────────────────────────────────────────────────

/**
 * GET /api/recommendations
 *
 * Returns personalised listing recommendations for a user, ranked by
 * cosine similarity with time-decay, and supporting infinite pagination.
 *
 * Query Parameters:
 *   - userId     (required) — UUID of the target user
 *   - limit      (optional) — Page size, 1–50, default 20
 *   - cursor     (optional) — Base64 pagination cursor from previous response
 *   - threshold  (optional) — Minimum similarity, 0–1, default 0.5
 *   - type       (optional) — Filter by listing type: hackathon | job | internship
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // ── 1. Fetch authenticated user or fallback ─────────────────────────
  
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const MOCK_USER_ID = "00000000-0000-0000-0000-000000000000";
  const queryUserId = searchParams.get("userId");

  let userId = user?.id;

  if (!userId) {
    if (queryUserId && queryUserId !== MOCK_USER_ID) {
      return Response.json(
        { error: "Unauthorized. Guest users may only request recommendations using the guest ID." },
        { status: 401 }
      );
    }
    userId = queryUserId;
  }

  if (!userId || !UUID_REGEX.test(userId)) {
    return Response.json(
      { error: "Missing or invalid 'userId' parameter. Must be a valid UUID." },
      { status: 400 }
    );
  }

  // ── 2. Parse & validate parameters ─────────────────────────────────────

  const limitParam = searchParams.get("limit");
  let limit = DEFAULT_PAGE_SIZE;
  if (limitParam !== null) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1) {
      return Response.json(
        { error: "'limit' must be a positive integer." },
        { status: 400 }
      );
    }
    limit = Math.min(parsed, MAX_PAGE_SIZE);
  }

  const thresholdParam = searchParams.get("threshold");
  let threshold = DEFAULT_THRESHOLD;
  if (thresholdParam !== null) {
    const parsed = parseFloat(thresholdParam);
    if (isNaN(parsed) || parsed < 0 || parsed > 1) {
      return Response.json(
        { error: "'threshold' must be a number between 0 and 1." },
        { status: 400 }
      );
    }
    threshold = parsed;
  }

  const typeFilter = searchParams.get("type");
  if (typeFilter !== null && !VALID_TYPES.has(typeFilter)) {
    return Response.json(
      {
        error: `Invalid 'type' parameter. Must be one of: ${[...VALID_TYPES].join(", ")}.`,
      },
      { status: 400 }
    );
  }

  // ── 2. Decode pagination cursor ────────────────────────────────────────

  const cursorParam = searchParams.get("cursor");
  let cursorScore: number | null = null;
  let cursorId: string | null = null;

  if (cursorParam !== null) {
    const decoded = decodeCursor<RecommendationCursor>(cursorParam, (d) =>
      typeof d.score === "number" &&
      typeof d.id === "string" &&
      UUID_REGEX.test(d.id)
    );
    if (!decoded) {
      return Response.json(
        { error: "Invalid 'cursor' parameter. Must be a valid pagination token." },
        { status: 400 }
      );
    }
    cursorScore = decoded.score;
    cursorId = decoded.id;
  }

  // ── 3. Call Supabase RPC ───────────────────────────────────────────────

  // Request extra rows to account for post-filtering by type and re-ranking
  const rpcLimit = typeFilter ? limit * 3 : limit + 5;

  try {
    const { data: rpcResults, error: rpcError } = await supabase.rpc(
      "recommend_listings_for_user",
      {
        p_user_id: userId,
        p_match_threshold: threshold,
        p_limit: rpcLimit,
        p_cursor_score: cursorScore,
        p_cursor_id: cursorId,
      }
    );

    if (rpcError) {
      console.error("[recommendations] Supabase RPC error:", rpcError);
      return Response.json(
        { error: "Failed to fetch recommendations. Please try again later." },
        { status: 500 }
      );
    }

    const rows = (rpcResults ?? []) as RecommendedListingRow[];

    // ── 4. Apply time-decay multiplier ─────────────────────────────────

    const now = Date.now();
    let results: RecommendedListing[] = rows.map((row) => ({
      ...row,
      final_score: applyTimeDecay(row.similarity, row.created_at, now),
    }));

    // ── 5. Re-sort by final_score (time-decay adjusted) ────────────────

    results.sort(
      (a, b) => b.final_score - a.final_score || b.id.localeCompare(a.id)
    );

    // ── 6. Apply optional type filter ──────────────────────────────────

    if (typeFilter) {
      results = results.filter(
        (r) => r.type === (typeFilter as ListingType)
      );
    }

    // ── 7. Trim to requested page size ─────────────────────────────────

    const hasMore = results.length > limit;
    const pageResults = results.slice(0, limit);

    // ── 8. Build pagination cursor ─────────────────────────────────────

    let nextCursor: string | null = null;
    if (hasMore && pageResults.length > 0) {
      const lastItem = pageResults[pageResults.length - 1];
      nextCursor = encodeCursor({
        score: lastItem.similarity, // Use raw similarity for RPC cursor, not final_score
        id: lastItem.id,
      });
    }

    // ── 9. Return response ─────────────────────────────────────────────

    const response: RecommendationResponse = {
      data: pageResults,
      pagination: {
        next_cursor: nextCursor,
        has_more: hasMore,
        page_size: pageResults.length,
      },
    };

    return Response.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("[recommendations] Unexpected error:", error);
    return Response.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
