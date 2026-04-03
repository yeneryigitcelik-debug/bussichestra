"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail, Send, Play, Loader2, RefreshCw, Filter,
  ArrowRight, CheckCircle2, Clock, AlertTriangle, Zap, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkerAvatar } from "@/components/workers/WorkerAvatar";
import { SkeletonRow } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";

interface WorkerInfo {
  id: string;
  name: string;
  role: string;
  department: string;
  status: string;
}

interface TaskItem {
  id: string;
  workerId?: string;
  actorId?: string;
  actorName?: string;
  action?: string;
  entityType?: string;
  entityName?: string;
  type: string;
  status: string;
  priority: string;
  input: Record<string, unknown>;
  result: unknown;
  createdAt: string;
  completedAt: string | null;
}

const priorityColors: Record<string, string> = {
  urgent: "text-red-400 bg-red-500/10 border-red-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  medium: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  low: "text-gray-400 bg-gray-500/10 border-gray-500/20",
};

const statusColors: Record<string, string> = {
  pending: "text-yellow-400 bg-yellow-500/10",
  running: "text-blue-400 bg-blue-500/10",
  completed: "text-emerald-400 bg-emerald-500/10",
  failed: "text-red-400 bg-red-500/10",
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

export default function PipelinePage() {
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  // Email form
  const [emailFrom, setEmailFrom] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [workersRes, tasksRes] = await Promise.all([
        fetch("/api/workers"),
        fetch("/api/activity?limit=30"),
      ]);

      if (workersRes.ok) {
        const wData = await workersRes.json();
        const wList = Array.isArray(wData) ? wData : wData.workers || [];
        setWorkers(wList.map((w: Record<string, unknown>) => ({
          id: String(w.id),
          name: String(w.name),
          role: String(w.role),
          department: (w.settings as { department_name?: string })?.department_name || "General",
          status: String(w.status || "active"),
        })));
      }

      // Fetch worker tasks for pipeline view
      // We'll get all recent tasks across workers
      if (tasksRes.ok) {
        const actData = await tasksRes.json();
        setTasks(Array.isArray(actData) ? actData : actData.logs || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const sendEmailToPipeline = async () => {
    if (!emailFrom || !emailSubject || !emailBody) return;
    setSendingEmail(true);
    try {
      const res = await fetch("/api/pipeline/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_address: emailFrom,
          to_address: emailTo || "inbox@company.com",
          subject: emailSubject,
          body_text: emailBody,
        }),
      });
      if (res.ok) {
        setShowSendEmail(false);
        setEmailFrom("");
        setEmailTo("");
        setEmailSubject("");
        setEmailBody("");
        await fetchData();
      }
    } catch {
      // ignore
    } finally {
      setSendingEmail(false);
    }
  };

  const processAllPending = async () => {
    setProcessing(true);
    try {
      await fetch("/api/pipeline/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await fetchData();
    } catch {
      // ignore
    } finally {
      setProcessing(false);
    }
  };

  const workerMap = Object.fromEntries(workers.map((w) => [w.id, w]));

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">Pipeline</h1>
          <p className="text-sm text-muted-foreground">Route events to workers and monitor processing</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSendEmail(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-secondary transition-colors"
          >
            <Mail className="h-3.5 w-3.5" /> Simulate Email
          </button>
          <button
            onClick={processAllPending}
            disabled={processing}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Process All Workers
          </button>
          <button onClick={fetchData} className="rounded-lg border border-border p-2 hover:bg-secondary transition-colors">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Worker Status Bar */}
        <div className="border-b border-border bg-card/50 px-6 py-3">
          <div className="flex items-center gap-4 overflow-x-auto">
            {workers.map((w) => (
              <div key={w.id} className="flex items-center gap-2 shrink-0">
                <WorkerAvatar workerId={w.id} size="sm" status={w.status as "active" | "idle"} />
                <div>
                  <p className="text-xs font-medium">{w.name}</p>
                  <p className="text-[10px] text-muted-foreground">{w.department}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border/50">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {(["all", "pending", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium transition-colors capitalize",
                filter === f ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Activity/Task Feed */}
        <div className="p-6">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="No pipeline activity yet"
              description="Send an email or create an event to see the pipeline in action"
              action={{ label: "Simulate Email", onClick: () => setShowSendEmail(true) }}
            />
          ) : (
            <div className="space-y-2">
              {tasks.map((item, i) => {
                const worker = workerMap[item.actorId || item.workerId || ""];
                return (
                  <div
                    key={item.id || i}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:bg-secondary/30"
                  >
                    {worker ? (
                      <WorkerAvatar workerId={worker.id} size="md" showStatus={false} />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold">{item.actorName || "System"}</span>
                        {" "}
                        <span className="text-muted-foreground">
                          {item.action} {item.entityName}
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(item.createdAt)}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Simulate Email Dialog */}
      {showSendEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSendEmail(false)}>
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Simulate Incoming Email</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This simulates an email arriving in your system. The pipeline will route it to the appropriate worker.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <input
                  value={emailFrom}
                  onChange={(e) => setEmailFrom(e.target.value)}
                  placeholder="client@acme.com"
                  className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <input
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="inbox@company.com"
                  className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Subject</label>
                <input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Invoice payment confirmation"
                  className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Body</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Hi, we have processed the payment for invoice INV-2026-001..."
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowSendEmail(false)}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendEmailToPipeline}
                disabled={sendingEmail || !emailFrom || !emailSubject || !emailBody}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {sendingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send to Pipeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
