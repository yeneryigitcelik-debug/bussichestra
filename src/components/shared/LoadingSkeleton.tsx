"use client";

import { cn } from "@/lib/utils";

export function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-secondary/60", className)} />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="flex items-center gap-3 mb-3">
        <SkeletonPulse className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-3 w-20" />
          <SkeletonPulse className="h-5 w-32" />
        </div>
      </div>
      <SkeletonPulse className="h-3 w-24" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 border-b border-border px-5 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonPulse key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-border/50 last:border-0 px-5 py-4">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonPulse key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-border/50 last:border-0">
      <SkeletonPulse className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonPulse className="h-4 w-48" />
        <SkeletonPulse className="h-3 w-32" />
      </div>
      <SkeletonPulse className="h-6 w-16 rounded-full" />
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="space-y-2">
        <SkeletonPulse className="h-7 w-48" />
        <SkeletonPulse className="h-4 w-72" />
      </div>
      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      {/* Table */}
      <SkeletonTable />
    </div>
  );
}
