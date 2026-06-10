"use client";

import { useState, useEffect } from "react";
import { useListings } from "@/hooks/useListings";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useUser } from "@/hooks/useUser";
import { FilterBar } from "@/components/FilterBar";
import { ListingCard } from "@/components/ListingCard";
import { ListingCardSkeleton } from "@/components/ListingCardSkeleton";
import { saveListingOptimistic, unsaveListingOptimistic, getSavedListingIds } from "@/lib/supabase/interactions";
import type { DiscoveryFilters } from "@/types/database";

export function DiscoveryClient() {
  const [filters, setFilters] = useState<DiscoveryFilters>({
    type: "all",
    location: "all",
  });
  
  const { listings, isLoading, isFetchingMore, hasMore, loadMore, error } = useListings(filters);
  const sentinelRef = useInfiniteScroll(loadMore);
  
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isSavedIdsLoaded, setIsSavedIdsLoaded] = useState(false);
  const userId = useUser();

  useEffect(() => {
    if (!userId) return;
    // Initial fetch of saved items
    getSavedListingIds(userId).then((ids) => {
      setSavedIds(new Set(ids));
      setIsSavedIdsLoaded(true);
    });
  }, [userId]);

  const handleSaveToggle = async (id: string, currentlySaved: boolean) => {
    if (!userId) return;

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
      success = await unsaveListingOptimistic(id, userId);
    } else {
      success = await saveListingOptimistic(id, userId);
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

  return (
    <>
      <FilterBar filters={filters} onChange={setFilters} />
      
      {error && (
        <div className="py-8 text-destructive bg-destructive/10 px-4 rounded-lg border border-destructive/20 mb-8">
          <p>Failed to load opportunities: {error}</p>
        </div>
      )}

      {isLoading || !isSavedIdsLoaded ? (
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
                index={i % 20}
                isSaved={savedIds.has(listing.id)}
                onSaveToggle={handleSaveToggle}
                showScore={false} // Score doesn't apply to generic discovery
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
              <p>You&apos;ve reached the end of the list.</p>
            </div>
          )}
        </>
      ) : (
        <div className="py-20 text-center bg-card rounded-xl border border-border">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <h3 className="text-lg font-bold mb-1">No matches found</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            We couldn&apos;t find any opportunities matching your current filters. 
            Try adjusting your criteria.
          </p>
          <button 
            onClick={() => setFilters({ type: "all", location: "all" })}
            className="mt-6 px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}
    </>
  );
}
