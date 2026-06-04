"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";

interface SearchResult {
  id: string;
  title: string;
  type: string;
  location: string;
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 500);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function performSearch() {
      if (!debouncedQuery) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: debouncedQuery }),
        });
        const data = await res.json();
        if (data.results) {
          setResults(data.results);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }

    performSearch();
  }, [debouncedQuery]);

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search semantic tags or titles..."
          className="pl-10 h-12 rounded-full border-border bg-card shadow-sm transition-all focus-visible:ring-1 focus-visible:ring-primary"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>

      <AnimatePresence>
        {isOpen && (query || results.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-14 left-0 right-0 bg-card rounded-xl shadow-lg border border-border p-2 z-50 overflow-hidden"
          >
            {results.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {results.map((r) => (
                  <li
                    key={r.id}
                    className="p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  >
                    <div className="font-medium text-sm">{r.title}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {r.type} {r.location ? `• ${r.location}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            ) : isSearching ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Thinking...
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
