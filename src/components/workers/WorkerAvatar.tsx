"use client";

import { cn } from "@/lib/utils";

interface WorkerAvatarProps {
  workerId: string;
  size?: "sm" | "md" | "lg" | "xl";
  status?: "active" | "idle" | "stuck" | "offline";
  showStatus?: boolean;
  className?: string;
}

// 8x8 pixel art grids — each row is an array of color codes
// Colors: 0=transparent, 1=skin, 2=hair, 3=eyes, 4=mouth, 5=shirt, 6=accent
const PIXEL_CHARS: Record<string, { grid: number[][]; palette: Record<number, string> }> = {
  sophia: {
    grid: [
      [0,0,2,2,2,2,0,0],
      [0,2,2,2,2,2,2,0],
      [0,2,1,1,1,1,2,0],
      [0,1,3,1,1,3,1,0],
      [0,1,1,1,1,1,1,0],
      [0,0,1,4,4,1,0,0],
      [0,5,5,6,6,5,5,0],
      [0,5,5,5,5,5,5,0],
    ],
    palette: {
      1: "#F4C49C", 2: "#2D1B4E", 3: "#8B5CF6", 4: "#E879A0",
      5: "#6D28D9", 6: "#A78BFA",
    },
  },
  ayse: {
    grid: [
      [0,0,2,2,2,2,0,0],
      [0,2,2,2,2,2,2,0],
      [2,2,1,1,1,1,2,2],
      [0,1,3,1,1,3,1,0],
      [0,1,1,1,1,1,1,0],
      [0,0,1,4,4,1,0,0],
      [0,5,5,6,6,5,5,0],
      [0,5,5,5,5,5,5,0],
    ],
    palette: {
      1: "#F4C49C", 2: "#1A1A2E", 3: "#10B981", 4: "#FB923C",
      5: "#065F46", 6: "#34D399",
    },
  },
  marco: {
    grid: [
      [0,0,2,2,2,2,0,0],
      [0,2,2,2,2,2,2,0],
      [0,1,1,1,1,1,1,0],
      [0,1,3,1,1,3,1,0],
      [0,1,1,1,1,1,1,0],
      [0,0,1,4,4,1,0,0],
      [0,5,5,6,6,5,5,0],
      [0,5,5,5,5,5,5,0],
    ],
    palette: {
      1: "#D4A574", 2: "#3B2506", 3: "#3B82F6", 4: "#FBBF24",
      5: "#1E40AF", 6: "#60A5FA",
    },
  },
  kenji: {
    grid: [
      [0,0,2,2,2,2,0,0],
      [0,2,2,2,2,2,2,0],
      [0,1,1,1,1,1,1,0],
      [0,1,3,1,1,3,1,0],
      [0,1,1,1,1,1,1,0],
      [0,0,1,4,4,1,0,0],
      [0,5,5,6,6,5,5,0],
      [0,5,5,5,5,5,5,0],
    ],
    palette: {
      1: "#F5DEB3", 2: "#0F172A", 3: "#F97316", 4: "#FB923C",
      5: "#C2410C", 6: "#FB923C",
    },
  },
  elif: {
    grid: [
      [0,0,2,2,2,2,0,0],
      [0,2,2,2,2,2,2,0],
      [2,2,1,1,1,1,2,2],
      [0,1,3,1,1,3,1,0],
      [0,1,1,1,1,1,1,0],
      [0,0,1,4,4,1,0,0],
      [0,5,5,6,6,5,5,0],
      [0,5,5,5,5,5,5,0],
    ],
    palette: {
      1: "#F4C49C", 2: "#7C2D12", 3: "#EC4899", 4: "#F472B6",
      5: "#BE185D", 6: "#F472B6",
    },
  },
};

// Fallback: generate avatar from name
function generateFallback(name: string): { grid: number[][]; palette: Record<number, string> } {
  const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return {
    grid: [
      [0,0,2,2,2,2,0,0],
      [0,2,2,2,2,2,2,0],
      [0,1,1,1,1,1,1,0],
      [0,1,3,1,1,3,1,0],
      [0,1,1,1,1,1,1,0],
      [0,0,1,4,4,1,0,0],
      [0,5,5,6,6,5,5,0],
      [0,5,5,5,5,5,5,0],
    ],
    palette: {
      1: "#F4C49C", 2: `hsl(${hue}, 40%, 20%)`, 3: `hsl(${hue}, 70%, 60%)`,
      4: "#FB923C", 5: `hsl(${hue}, 60%, 35%)`, 6: `hsl(${hue}, 70%, 55%)`,
    },
  };
}

const sizes = {
  sm: { px: 3, container: "w-6 h-6" },
  md: { px: 4, container: "w-8 h-8" },
  lg: { px: 5, container: "w-10 h-10" },
  xl: { px: 7, container: "w-14 h-14" },
};

const statusColors: Record<string, string> = {
  active: "bg-green-400 shadow-green-400/50",
  idle: "bg-yellow-400 shadow-yellow-400/50",
  stuck: "bg-red-400 shadow-red-400/50",
  offline: "bg-gray-500",
};

export function WorkerAvatar({ workerId, size = "md", status, showStatus = true, className }: WorkerAvatarProps) {
  const charData = PIXEL_CHARS[workerId] || generateFallback(workerId);
  const { px, container } = sizes[size];
  const svgSize = 8 * px;

  return (
    <div className={cn("relative shrink-0", className)}>
      <div className={cn(
        container,
        "overflow-hidden rounded-lg ring-1 ring-white/10",
        "bg-gradient-to-br from-gray-800 to-gray-900"
      )}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          style={{ imageRendering: "pixelated" }}
        >
          {charData.grid.map((row, y) =>
            row.map((cell, x) => {
              if (cell === 0) return null;
              return (
                <rect
                  key={`${x}-${y}`}
                  x={x * px}
                  y={y * px}
                  width={px}
                  height={px}
                  fill={charData.palette[cell] || "#000"}
                />
              );
            })
          )}
        </svg>
      </div>
      {showStatus && status && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-card shadow-sm",
            statusColors[status] || statusColors.offline,
            size === "sm" ? "h-2.5 w-2.5" : size === "xl" ? "h-4 w-4" : "h-3 w-3"
          )}
        />
      )}
    </div>
  );
}
