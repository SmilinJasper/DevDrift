"use client";

import { motion } from "framer-motion";
import type { DiscoveryFilters, ListingType } from "@/types/database";

interface FilterBarProps {
  filters: DiscoveryFilters;
  onChange: (filters: DiscoveryFilters) => void;
}

const typeOptions: { value: ListingType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "hackathon", label: "Hackathons" },
  { value: "job", label: "Jobs" },
  { value: "internship", label: "Internships" },
];

const locationOptions: { value: "all" | "india" | "global"; label: string }[] = [
  { value: "all", label: "Anywhere" },
  { value: "india", label: "India" },
  { value: "global", label: "Global / Remote" },
];

export function FilterBar({ filters, onChange }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-4 mb-8">
      {/* Type Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground mr-2">Looking for:</span>
        <div className="flex flex-wrap gap-1 p-1 bg-secondary rounded-lg">
          {typeOptions.map((option) => {
            const isSelected = filters.type === option.value;
            return (
              <button
                key={option.value}
                onClick={() => onChange({ ...filters, type: option.value })}
                className={`relative px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isSelected ? "text-white" : "text-secondary-foreground hover:text-foreground"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="type-filter-bg"
                    className="absolute inset-0 bg-dd-accent rounded-md"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Location Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground mr-2">Location:</span>
        <div className="flex flex-wrap gap-1 p-1 bg-secondary rounded-lg">
          {locationOptions.map((option) => {
            const isSelected = filters.location === option.value;
            return (
              <button
                key={option.value}
                onClick={() => onChange({ ...filters, location: option.value })}
                className={`relative px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isSelected ? "text-white" : "text-secondary-foreground hover:text-foreground"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="location-filter-bg"
                    className="absolute inset-0 bg-dd-accent rounded-md"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
