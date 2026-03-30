"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: { value: string; positive: boolean };
  iconColor?: string;
  href?: string;
  onClick?: () => void;
}

export function StatCard({ icon: Icon, label, value, trend, iconColor = "text-primary bg-primary/10", href, onClick }: StatCardProps) {
  const Comp = href ? "a" : onClick ? "button" : "div";
  const props = href ? { href } : onClick ? { onClick } : {};

  return (
    <Comp
      {...props}
      className={cn(
        "rounded-xl border border-border bg-card p-5 transition-all",
        (href || onClick) && "cursor-pointer card-hover"
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {trend && (
          <span className={cn(
            "text-xs font-medium",
            trend.positive ? "text-emerald-400" : "text-red-400"
          )}>
            {trend.positive ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
    </Comp>
  );
}
