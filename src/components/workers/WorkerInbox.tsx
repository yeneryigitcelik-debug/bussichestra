"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Inbox, Mail, CheckCircle2, Clock, AlertTriangle, Play,
  Loader2, RefreshCw, ChevronDown, ChevronRight, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkerAvatar } from "./WorkerAvatar";

interface InboxItem {
  id: string;
  type: string;
  status: string;
  priority: string;
  input?: { description?: string; event?: { subject?: string; content?: string } };
  created_at: string;
}

interface InboxMessage {
  id: string;
  from_worker_id: string;
  subject: string;
  content: string;
  status: string;
  created_at: string;
}

interface InboxAlert {
  type: string;
  message: string;
  data?: unknown;
}

interface InboxData {
  tasks: InboxItem[];
  messages: InboxMessage[];
  notifications: { id: string; title: string; body: string; type: string; created_at: string }[];
  alerts: InboxAlert[];
  total_pending: number;
}

const priorityColors: Record<string, string> = {
  urgent: "text-red-400 bg-red-500/10 border-red-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  medium: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  low: "text-gray-400 bg-gray-500/10 border-gray-500/20",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface WorkerInboxProps {
  workerId: string;
  workerName: string;
  compact?: boolean;
}

export function WorkerInbox({ workerId, workerName, compact = false }: WorkerInboxProps) {
  const [data, setData] = useState<InboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("tasks");

  const fetchInbox = useCallback(async () => {
    try {
      const res = await fetch(`/api/workers/${workerId}/inbox`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    fetchInbox();
    const interval = setInterval(fetchInbox, 30000);
    return () => clearInterval(interval);
  }, [fetchInbox]);

  const processItem = async (itemType: string, itemId: string) => {
    setProcessing(itemId);
    try {
      const res = await fetch(`/api/workers/${workerId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_type: itemType, item_id: itemId }),
      });
      if (res.ok) {
        await fetchInbox(); // Refresh
      }
    } catch {
      // ignore
    } finally {
      setProcessing(null);
    }
  };

  const processAll = async () => {
    setProcessing("all");
    try {
      const res = await fetch("/api/pipeline/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worker_id: workerId }),
      });
      if (res.ok) {
        await fetchInbox();
      }
    } catch {
      // ignore
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className={cn("space-y-2", compact ? "p-3" : "p-4")}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg bg-secondary/40 h-14" />
        ))}
      </div>
    );
  }

  if (!data || data.total_pending === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center text-center", compact ? "py-8" : "py-12")}>
        <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">Inbox is clear</p>
        <p className="text-xs text-muted-foreground/60">{workerName} has no pending items</p>
      </div>
    );
  }

  const Section = ({ id, title, count, icon: Icon, children }: {
    id: string; title: string; count: number; icon: typeof Inbox; children: React.ReactNode;
  }) => {
    const isOpen = expandedSection === id;
    if (count === 0) return null;
    return (
      <div>
        <button
          onClick={() => setExpandedSection(isOpen ? null : id)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <Icon className="h-3 w-3" />
          {title}
          <span className="ml-auto rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
            {count}
          </span>
        </button>
        {isOpen && <div className="mt-1 space-y-1">{children}</div>}
      </div>
    );
  };

  return (
    <div className={cn(compact ? "p-3" : "p-4", "space-y-3")}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inbox</span>
          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
            {data.total_pending}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {data.total_pending > 0 && (
            <button
              onClick={processAll}
              disabled={processing === "all"}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {processing === "all" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              Process All
            </button>
          )}
          <button
            onClick={fetchInbox}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Tasks */}
      <Section id="tasks" title="Tasks" count={data.tasks.length} icon={CheckCircle2}>
        {data.tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-2 rounded-lg bg-secondary/30 p-2.5">
            <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium line-clamp-2">
                {task.input?.description || task.input?.event?.subject || `Task: ${task.type}`}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium border", priorityColors[task.priority] || priorityColors.medium)}>
                  {task.priority}
                </span>
                <span className="text-[10px] text-muted-foreground">{timeAgo(task.created_at)}</span>
              </div>
            </div>
            <button
              onClick={() => processItem("task", task.id)}
              disabled={processing === task.id}
              className="shrink-0 rounded-md bg-primary/20 p-1.5 text-primary hover:bg-primary/30 disabled:opacity-50 transition-colors"
              title="Process with AI"
            >
              {processing === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            </button>
          </div>
        ))}
      </Section>

      {/* Messages */}
      <Section id="messages" title="Messages" count={data.messages.length} icon={Mail}>
        {data.messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-2 rounded-lg bg-secondary/30 p-2.5">
            <WorkerAvatar workerId={msg.from_worker_id} size="sm" showStatus={false} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{msg.subject}</p>
              <p className="text-[10px] text-muted-foreground line-clamp-1">{msg.content}</p>
              <span className="text-[10px] text-muted-foreground/60">{timeAgo(msg.created_at)}</span>
            </div>
            <button
              onClick={() => processItem("message", msg.id)}
              disabled={processing === msg.id}
              className="shrink-0 rounded-md bg-primary/20 p-1.5 text-primary hover:bg-primary/30 disabled:opacity-50 transition-colors"
            >
              {processing === msg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            </button>
          </div>
        ))}
      </Section>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <Section id="alerts" title="Alerts" count={data.alerts.length} icon={AlertTriangle}>
          {data.alerts.map((alert, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10 p-2.5 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
              <span className="text-muted-foreground">{alert.message}</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
