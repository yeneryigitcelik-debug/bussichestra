"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SkeletonRow } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Bell,
  CheckCircle,
  DollarSign,
  AlertTriangle,
  Shield,
  MessageSquare,
  CheckCheck,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type:
    | "task_completed"
    | "invoice_paid"
    | "inventory_low"
    | "approval_needed"
    | "worker_message"
    | "system";
  title: string;
  body: string | null;
  isRead: boolean;
  sourceWorkerId: string | null;
  sourceWorker: { id: string; name: string } | null;
  createdAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const typeConfig: Record<
  string,
  { icon: typeof Bell; color: string; bg: string }
> = {
  task_completed: {
    icon: CheckCircle,
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  invoice_paid: {
    icon: DollarSign,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  inventory_low: {
    icon: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  approval_needed: {
    icon: Shield,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  worker_message: {
    icon: MessageSquare,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  system: {
    icon: Bell,
    color: "text-gray-400",
    bg: "bg-gray-500/10",
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Yesterday";
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDateGroup(iso: string): "Today" | "Yesterday" | "Earlier" {
  const d = new Date(iso);
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfYesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1
  );

  if (d >= startOfToday) return "Today";
  if (d >= startOfYesterday) return "Yesterday";
  return "Earlier";
}

function groupByDate(
  notifications: Notification[]
): { label: string; items: Notification[] }[] {
  const groups: Record<string, Notification[]> = {};
  const order = ["Today", "Yesterday", "Earlier"];

  for (const n of notifications) {
    const group = getDateGroup(n.createdAt);
    if (!groups[group]) groups[group] = [];
    groups[group].push(n);
  }

  return order
    .filter((label) => groups[label]?.length)
    .map((label) => ({ label, items: groups[label] }));
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? data ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // silently fail
    }
  }

  async function markAllRead() {
    try {
      setMarkingAll(true);
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true }))
        );
      }
    } catch {
      // silently fail
    } finally {
      setMarkingAll(false);
    }
  }

  function handleClick(notification: Notification) {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const grouped = groupByDate(notifications);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Stay up to date with your company activity
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 transition-colors"
          >
            {markingAll ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Mark All Read
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl">
          {loading ? (
            <div className="p-4 space-y-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications"
              description="You're all caught up. Notifications from your AI workers will appear here."
            />
          ) : (
            grouped.map((group) => (
              <div key={group.label}>
                {/* Group header */}
                <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm px-6 py-2">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                    {group.label}
                  </h3>
                </div>

                {/* Notification items */}
                {group.items.map((notification) => {
                  const cfg =
                    typeConfig[notification.type] ?? typeConfig.system;
                  const Icon = cfg.icon;

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleClick(notification)}
                      className={cn(
                        "flex cursor-pointer items-start gap-4 border-b border-border/50 px-6 py-4 transition-colors hover:bg-secondary/50",
                        !notification.isRead && "bg-secondary/20"
                      )}
                    >
                      {/* Type icon */}
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          cfg.bg
                        )}
                      >
                        <Icon className={cn("h-5 w-5", cfg.color)} />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm",
                              !notification.isRead
                                ? "font-semibold"
                                : "font-medium"
                            )}
                          >
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            {!notification.isRead && (
                              <span className="h-2 w-2 rounded-full bg-primary" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {timeAgo(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                        {notification.body && (
                          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                        {notification.sourceWorker && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-medium">
                              {notification.sourceWorker.name[0]}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {notification.sourceWorker.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
