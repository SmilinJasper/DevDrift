"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { ListingCard } from "./ListingCard";
import { ListingCardSkeleton } from "./ListingCardSkeleton";
import { saveListingOptimistic, unsaveListingOptimistic, getSavedListingIds } from "@/lib/supabase/interactions";
import type { RecommendedListing, RecommendationResponse } from "@/types/database";

export function HomeFeed() {
  const [listings, setListings] = useState<RecommendedListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  
  // Hardcoded for now. Phase 4 will introduce Auth.
  const MOCK_USER_ID = "00000000-0000-0000-0000-000000000000";
  
  const cursorRef = useRef<string | null>(null);

  const fetchRecommendations = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setIsFetchingMore(true);
    } else {
      setIsLoading(true);
      cursorRef.current = null;
    }
    setError(null);

    try {
      // Fetch user's saved items once
      if (!isLoadMore) {
        const ids = await getSavedListingIds(MOCK_USER_ID);
        setSavedIds(new Set(ids));
      }

      const params = new URLSearchParams();
      // Using mock ID to hit fallback trending, or real recommendation if it exists.
      params.set("userId", MOCK_USER_ID);
      params.set("limit", "12");
      if (isLoadMore && cursorRef.current) {
        params.set("cursor", cursorRef.current);
      }

      const res = await fetch(`/api/recommendations?${params.toString()}`);
      
      // If we got a 400 about the UUID, the API is strictly validating.
      // In this demo without real users, we might hit 400. Let's just fallback to /api/listings if so.
      if (!res.ok && res.status === 400) {
        console.warn("Falling back to generic listings because userId is invalid");
        const fallbackRes = await fetch(`/api/listings?limit=12${isLoadMore && cursorRef.current ? `&cursor=${encodeURIComponent(cursorRef.current)}` : ""}`);
        if (!fallbackRes.ok) throw new Error("Fallback fetch failed");
        
        const json = await fallbackRes.json();
        const mapped = json.data.map((l: any) => ({ ...l, similarity: 0.99 })); // Fake similarity
        if (isLoadMore) {
          setListings((prev) => [...prev, ...mapped]);
        } else {
          setListings(mapped);
        }
        setHasMore(json.pagination.has_more);
        cursorRef.current = json.pagination.next_cursor;
        return;
      }
      
      if (!res.ok) throw new Error("Failed to fetch recommendations");

      const json: RecommendationResponse = await res.json();
      
      if (isLoadMore) {
        setListings((prev) => [...prev, ...json.data]);
      } else {
        setListings(json.data);
      }
      
      setHasMore(json.pagination.has_more);
      cursorRef.current = json.pagination.next_cursor;
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations(false);
  }, [fetchRecommendations]);

  const loadMore = useCallback(() => {
    if (hasMore && !isFetchingMore && !isLoading) {
      fetchRecommendations(true);
    }
  }, [hasMore, isFetchingMore, isLoading, fetchRecommendations]);

  const sentinelRef = useInfiniteScroll(loadMore);

  const handleSaveToggle = async (id: string, currentlySaved: boolean) => {
    // Optimistic UI update
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (currentlySaved) next.delete(id);
      else next.add(id);
      return next;
    });

    // Fire network request
    let success = false;
    if (currentlySaved) {
      success = await unsaveListingOptimistic(id, MOCK_USER_ID);
    } else {
      success = await saveListingOptimistic(id, MOCK_USER_ID);
    }

    // Rollback if failed
    if (!success) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (currentlySaved) next.add(id);
        else next.delete(id);
        return next;
      });
    }
  };

  if (error) {
    return (
      <div className="py-12 text-center text-destructive">
        <p>Failed to load recommendations: {error}</p>
        <button 
          onClick={() => fetchRecommendations(false)}
          className="mt-4 px-4 py-2 bg-secondary text-secondary-foreground rounded-md"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="py-8">
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : listings.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing, i) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                index={i % 12}
                isSaved={savedIds.has(listing.id)}
                onSaveToggle={handleSaveToggle}
                showScore={true}
              />
            ))}
          </div>
          
          {hasMore && (
            <div ref={sentinelRef} className="py-12 flex justify-center">
              {isFetchingMore ? (
                <div className="w-8 h-8 rounded-full border-2 border-dd-accent border-t-transparent animate-spin"></div>
              ) : (
                <div className="text-muted-foreground text-sm">Scroll for more</div>
              )}
            </div>
          )}
          
          {!hasMore && (
            <div className="py-12 text-center text-muted-foreground">
              <p>You&apos;ve reached the end of your feed.</p>
            </div>
          )}
        </>
      ) : (
        <div className="py-20 text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">📭</span>
          </div>
          <h3 className="text-xl font-bold mb-2">No opportunities found</h3>
          <p className="text-muted-foreground">Check back later for new hackathons and jobs.</p>
        </div>
      )}
    </div>
  );
}
