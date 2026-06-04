"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Listing, DiscoveryFilters, ListingsResponse } from "@/types/database";

export function useListings(filters: DiscoveryFilters) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track the next cursor string.
  const cursorRef = useRef<string | null>(null);

  const fetchListings = useCallback(async (isLoadMore = false) => {
    if (!isLoadMore) {
      setIsLoading(true);
      cursorRef.current = null;
    } else {
      setIsFetchingMore(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (filters.type !== "all") params.set("type", filters.type);
      if (filters.location !== "all") params.set("location", filters.location);
      if (isLoadMore && cursorRef.current) params.set("cursor", cursorRef.current);

      const res = await fetch(`/api/listings?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch listings");
      }

      const json: ListingsResponse = await res.json();
      
      if (isLoadMore) {
        setListings((prev) => [...prev, ...json.data]);
      } else {
        setListings(json.data);
      }
      
      setHasMore(json.pagination.has_more);
      cursorRef.current = json.pagination.next_cursor;
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [filters.type, filters.location]);

  // Initial fetch when filters change
  useEffect(() => {
    fetchListings(false);
  }, [fetchListings]);

  const loadMore = useCallback(() => {
    if (hasMore && !isFetchingMore && !isLoading) {
      fetchListings(true);
    }
  }, [hasMore, isFetchingMore, isLoading, fetchListings]);

  return {
    listings,
    isLoading,
    isFetchingMore,
    hasMore,
    loadMore,
    error
  };
}
