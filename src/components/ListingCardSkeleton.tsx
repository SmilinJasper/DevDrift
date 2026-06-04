"use client";

export function ListingCardSkeleton() {
  return (
    <div className="flex flex-col bg-dd-card-bg border border-border/50 rounded-xl p-5 overflow-hidden animate-pulse h-full min-h-[220px]">
      {/* Top Meta Row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-24 h-6 bg-muted rounded-full"></div>
          <div className="w-16 h-6 bg-muted rounded-full"></div>
        </div>
        <div className="w-8 h-8 bg-muted rounded-full"></div>
      </div>

      {/* Content */}
      <div className="w-3/4 h-6 bg-muted rounded-md mb-3"></div>
      <div className="w-full h-4 bg-muted rounded-md mb-2"></div>
      <div className="w-2/3 h-4 bg-muted rounded-md mb-6"></div>

      {/* Meta Details */}
      <div className="mt-auto pt-4 flex flex-col gap-3">
        <div className="flex gap-4">
          <div className="w-20 h-4 bg-muted rounded-md"></div>
          <div className="w-24 h-4 bg-muted rounded-md"></div>
        </div>
        <div className="flex gap-2">
          <div className="w-16 h-5 bg-muted rounded-md"></div>
          <div className="w-20 h-5 bg-muted rounded-md"></div>
        </div>
      </div>
    </div>
  );
}
