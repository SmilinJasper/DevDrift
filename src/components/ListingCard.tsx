"use client";

import { motion } from "framer-motion";
import { Bookmark, ExternalLink, MapPin, Calendar, Briefcase, Zap } from "lucide-react";
import type { Listing, RecommendedListingRow, ListingType } from "@/types/database";

interface ListingCardProps {
  listing: Listing | RecommendedListingRow;
  isSaved?: boolean;
  onSaveToggle?: (id: string, currentlySaved: boolean) => void;
  showScore?: boolean;
  index?: number;
}

const typeStyles: Record<ListingType, { bg: string; text: string; icon: React.ReactNode }> = {
  hackathon: { bg: "bg-emerald-500/10", text: "text-emerald-500", icon: <Zap className="w-3.5 h-3.5" /> },
  job: { bg: "bg-blue-500/10", text: "text-blue-500", icon: <Briefcase className="w-3.5 h-3.5" /> },
  internship: { bg: "bg-orange-500/10", text: "text-orange-500", icon: <Briefcase className="w-3.5 h-3.5" /> },
};

function formatDateRange(start: string | null, end: string | null) {
  if (!start) return "";
  const startDate = new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (!end) return startDate;
  const endDate = new Date(end).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${startDate} - ${endDate}`;
}

import { useEffect, useRef } from "react";
import { viewObserver } from "@/hooks/useViewObserver";

export function ListingCard({
  listing,
  isSaved = false,
  onSaveToggle,
  showScore = false,
  index = 0,
}: ListingCardProps) {
  const style = typeStyles[listing.type];
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (el) {
      viewObserver.observe(el, () => {
        fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listing_id: listing.id, kind: "view" }),
        }).catch(() => {});
      });
    }

    return () => {
      if (el) {
        viewObserver.unobserve(el);
      }
    };
  }, [listing.id]);

  // Format score as percentage if provided
  const scoreBadge = "similarity" in listing && showScore ? (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-dd-accent-glow text-dd-accent text-xs font-semibold">
      <Zap className="w-3 h-3" />
      {Math.round((listing as RecommendedListingRow).similarity * 100)}% Match
    </div>
  ) : null;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ y: -4, boxShadow: "0px 10px 30px -10px var(--color-dd-accent-glow)" }}
      className="relative flex flex-col bg-dd-card-bg border border-border/50 rounded-xl p-5 overflow-hidden group"
    >
      {/* Top Meta Row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
            {style.icon}
            <span className="capitalize">{listing.type}</span>
          </span>
          {scoreBadge}
        </div>
        
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSaveToggle?.(listing.id, isSaved);
          }}
          className={`p-2 rounded-full transition-colors ${
            isSaved ? "bg-dd-accent-glow text-dd-accent" : "hover:bg-muted text-muted-foreground hover:text-foreground"
          }`}
          aria-label={isSaved ? "Unsave" : "Save"}
        >
          <motion.div whileTap={{ scale: 0.8 }}>
            <Bookmark className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
          </motion.div>
        </button>
      </div>

      {/* Content */}
      <h3 className="text-lg font-bold leading-tight mb-2 group-hover:text-dd-accent transition-colors">
        {listing.title}
      </h3>
      
      {listing.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {listing.description}
        </p>
      )}

      {/* Meta Details */}
      <div className="mt-auto pt-4 flex flex-col gap-2">
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          {(listing.location || listing.is_remote) && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {listing.is_remote ? "Remote" : listing.location}
                {listing.is_remote && listing.location ? ` • ${listing.location}` : ""}
              </span>
            </div>
          )}
          {listing.starts_at && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDateRange(listing.starts_at, listing.ends_at)}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {listing.tags && listing.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-2">
            {listing.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">
                {tag}
              </span>
            ))}
            {listing.tags.length > 3 && (
              <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">
                +{listing.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Apply Button */}
      {listing.application_url && (
        <div className="mt-5">
          <a
            href={listing.application_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-secondary hover:bg-dd-gradient hover:text-white transition-all text-sm font-semibold group/btn"
          >
            Apply Now
            <ExternalLink className="w-4 h-4 opacity-70 group-hover/btn:opacity-100" />
          </a>
        </div>
      )}
    </motion.div>
  );
}
