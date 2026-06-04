import { type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Listing,
  ListingCursor,
  ListingsResponse,
  ListingType,
} from "@/types/database";

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;

const VALID_TYPES: ReadonlySet<string> = new Set([
  "hackathon",
  "job",
  "internship",
]);

const VALID_LOCATIONS: ReadonlySet<string> = new Set([
  "all",
  "india",
  "global",
]);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Helpers ──────────────────────────────────────────────────────────────────

function decodeCursor(cursor: string): ListingCursor | null {
  try {
    const decoded = JSON.parse(atob(cursor));
    if (
      typeof decoded.popularity_score === "number" &&
      typeof decoded.id === "string" &&
      UUID_REGEX.test(decoded.id)
    ) {
      return decoded as ListingCursor;
    }
    return null;
  } catch {
    return null;
  }
}

function encodeCursor(cursor: ListingCursor): string {
  return btoa(JSON.stringify(cursor));
}

// ── Route Handler ────────────────────────────────────────────────────────────

/**
 * GET /api/listings
 *
 * Returns paginated listings for the Discovery dashboard.
 *
 * Query Parameters:
 *   - limit      (optional) — Page size, 1–50, default 20
 *   - cursor     (optional) — Base64 pagination cursor from previous response
 *   - type       (optional) — Filter by listing type: all | hackathon | job | internship
 *   - location   (optional) — Filter by location: all | india | global
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // ── 1. Parse & validate parameters ─────────────────────────────────────

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

  const typeFilter = searchParams.get("type");
  if (typeFilter !== null && typeFilter !== "all" && !VALID_TYPES.has(typeFilter)) {
    return Response.json(
      {
        error: `Invalid 'type' parameter. Must be one of: all, ${[...VALID_TYPES].join(", ")}.`,
      },
      { status: 400 }
    );
  }

  const locationFilter = searchParams.get("location");
  if (
    locationFilter !== null &&
    !VALID_LOCATIONS.has(locationFilter)
  ) {
    return Response.json(
      {
        error: `Invalid 'location' parameter. Must be one of: ${[...VALID_LOCATIONS].join(", ")}.`,
      },
      { status: 400 }
    );
  }

  // ── 2. Decode pagination cursor ────────────────────────────────────────

  const cursorParam = searchParams.get("cursor");
  let cursorScore: number | null = null;
  let cursorId: string | null = null;

  if (cursorParam !== null) {
    const decoded = decodeCursor(cursorParam);
    if (!decoded) {
      return Response.json(
        { error: "Invalid 'cursor' parameter. Must be a valid pagination token." },
        { status: 400 }
      );
    }
    cursorScore = decoded.popularity_score;
    cursorId = decoded.id;
  }

  // ── 3. Build Supabase Query ────────────────────────────────────────────

  try {
    const supabase = await createSupabaseServerClient();
    
    // We request limit + 1 to know if there's a next page
    let query = supabase
      .from("listings")
      .select("*")
      .eq("is_published", true)
      .limit(limit + 1);

    // Apply type filter
    if (typeFilter && typeFilter !== "all") {
      query = query.eq("type", typeFilter);
    }

    // Apply location filter
    if (locationFilter === "india") {
      query = query.ilike("location", "%india%");
    } else if (locationFilter === "global") {
      // Global usually means Remote or not specifically India.
      query = query.or("is_remote.eq.true,location.not.ilike.%india%");
    }

    // Apply keyset pagination: order by popularity_score DESC, id DESC
    // If we have a cursor, we want:
    // (popularity_score < cursorScore) OR (popularity_score = cursorScore AND id < cursorId)
    if (cursorScore !== null && cursorId !== null) {
      query = query.or(
        `popularity_score.lt.${cursorScore},and(popularity_score.eq.${cursorScore},id.lt."${cursorId}")`
      );
    }

    // Orderings
    query = query
      .order("popularity_score", { ascending: false })
      .order("id", { ascending: false });

    const { data: rows, error: dbError } = await query;

    if (dbError) {
      console.error("[listings] Supabase query error:", dbError);
      return Response.json(
        { error: "Failed to fetch listings. Please try again later." },
        { status: 500 }
      );
    }

    const results = (rows ?? []) as Listing[];

    // ── 4. Build pagination cursor ─────────────────────────────────────

    const hasMore = results.length > limit;
    const pageResults = hasMore ? results.slice(0, limit) : results;

    let nextCursor: string | null = null;
    if (hasMore && pageResults.length > 0) {
      const lastItem = pageResults[pageResults.length - 1];
      nextCursor = encodeCursor({
        popularity_score: lastItem.popularity_score,
        id: lastItem.id,
      });
    }

    // ── 5. Return response ─────────────────────────────────────────────

    const response: ListingsResponse = {
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
    console.error("[listings] Unexpected error:", error);
    return Response.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
