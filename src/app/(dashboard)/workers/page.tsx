"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users, Plus, Search, MessageSquare, Settings2, Crown,
  CircleDot, Zap, Brain, MoreVertical, Power, Trash2, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AddWorkerDialog } from "@/components/workers/AddWorkerDialog";

interface Worker {
  id: string;
  name: string;
  role: string;
  persona: string;
  status: string;
  tools: string[];
  is_manager: boolean;
  model: string;
  temperature: number;
  language: string;
  email: string | null;
  settings: Record<string, string>;
  department_name?: string;
  created_at: string;
}

const departmentColors: Record<string, string> = {
  Executive: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Finance: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Sales: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Operations: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Human Resources": "bg-pink-500/10 text-pink-400 border-pink-500/20",
  Marketing: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Legal: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "IT & Technology": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  "Customer Success": "bg-teal-500/10 text-teal-400 border-teal-500/20",
};

const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color: "bg-green-500", label: "Active" },
  idle: { color: "bg-yellow-500", label: "Idle" },
  stuck: { color: "bg-red-500", label: "Stuck" },
  offline: { color: "bg-gray-500", label: "Offline" },
};

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const fetchWorkers = useCallback(async () => {
    try {
      const res = await fetch("/api/workers");
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.workers || []);
      // Normalize both Prisma camelCase (authenticated) and snake_case (demo) formats
      setWorkers(list.map((w: Record<string, unknown>) => {
        const dept = (w.department as { name?: string })?.name
          || w.department_name as string
          || (w.settings as Record<string, string>)?.department_name
          || "General";
        return {
          id: String(w.id),
          name: String(w.name || ""),
          role: String(w.role || ""),
          persona: String(w.persona || ""),
          status: String(w.status || "active"),
          tools: Array.isArray(w.tools) ? w.tools : [],
          is_manager: Boolean(w.isManager ?? w.is_manager),
          model: String(w.model || ""),
          temperature: Number(w.temperature ?? 0.7),
          language: String(w.language || "en"),
          email: (w.email as string) || null,
          settings: (w.settings as Record<string, string>) || {},
          department_name: dept,
          created_at: String(w.createdAt || w.created_at || ""),
        };
      }));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWorkers(); }, [fetchWorkers]);

  const toggleWorkerStatus = async (worker: Worker) => {
    const newStatus = worker.status === "active" ? "offline" : "active";
    await fetch("/api/workers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: worker.id, status: newStatus }),
    });
    setWorkers((prev) => prev.map((w) => w.id === worker.id ? { ...w, status: newStatus } : w));
    setMenuOpenId(null);
  };

  const deleteWorker = async (id: string) => {
    if (!confirm("Are you sure? This worker and all their conversations will be permanently deleted.")) return;
    await fetch(`/api/workers?id=${id}`, { method: "DELETE" });
    setWorkers((prev) => prev.filter((w) => w.id !== id));
    setMenuOpenId(null);
  };

  const getDepartment = (w: Worker) => w.department_name || w.settings?.department_name || "General";

  const filtered = workers.filter((w) => {
    const matchSearch = !search || w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.role.toLowerCase().includes(search.toLowerCase()) ||
      getDepartment(w).toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || w.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: workers.length,
    active: workers.filter((w) => w.status === "active").length,
    managers: workers.filter((w) => w.is_manager).length,
    tools: workers.reduce((sum, w) => sum + (w.tools?.length || 0), 0),
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">AI Workers</h1>
          <p className="text-sm text-muted-foreground">Manage your virtual team</p>
        </div>
        <button
          onClick={() => setAddDialogOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Hire Worker
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 border-b border-border bg-card/50 p-4 sm:grid-cols-4">
        {[
          { label: "Total Workers", value: stats.total, icon: Users, color: "text-blue-400" },
          { label: "Active Now", value: stats.active, icon: CircleDot, color: "text-green-400" },
          { label: "Managers", value: stats.managers, icon: Crown, color: "text-purple-400" },
          { label: "Total Tools", value: stats.tools, icon: Zap, color: "text-amber-400" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <stat.icon className={cn("h-5 w-5", stat.color)} />
            <div>
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workers..."
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {["all", "active", "idle", "offline"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filterStatus === status ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"
              )}
            >
              {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Worker List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Users className="h-8 w-8" />
            <p className="text-sm">{search ? "No workers match your search" : "No workers yet"}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((worker) => {
              const dept = getDepartment(worker);
              const statusCfg = statusConfig[worker.status] || statusConfig.offline;
              return (
                <div key={worker.id} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-secondary/30">
                  {/* Avatar */}
                  <div className="relative">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold",
                      worker.is_manager ? "bg-purple-500/20 text-purple-400" : "bg-secondary text-foreground"
                    )}>
                      {worker.is_manager ? <Crown className="h-6 w-6" /> : worker.name[0]}
                    </div>
                    <span className={cn("absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card", statusCfg.color)} />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/workers/${worker.id}`} className="font-semibold hover:underline">
                        {worker.name}
                      </Link>
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        {worker.role}
                      </span>
                      <span className={cn("rounded-md border px-2 py-0.5 text-xs", departmentColors[dept] || "bg-secondary text-muted-foreground")}>
                        {dept}
                      </span>
                      {worker.is_manager && (
                        <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400">Manager</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" /> {worker.tools?.length || 0} tools
                      </span>
                      <span className="flex items-center gap-1">
                        <Brain className="h-3 w-3" /> {worker.model?.includes("opus") ? "Opus" : "Sonnet"}
                      </span>
                      <span className="flex items-center gap-1">
                        <CircleDot className="h-3 w-3" /> {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/chat/${worker.id}`}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Chat
                    </Link>
                    <Link
                      href={`/workers/${worker.id}`}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      <Settings2 className="h-3.5 w-3.5" /> Manage
                    </Link>

                    {/* Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === worker.id ? null : worker.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuOpenId === worker.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                          <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-border bg-card py-1 shadow-lg">
                            <Link
                              href={`/workers/${worker.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"
                              onClick={() => setMenuOpenId(null)}
                            >
                              <Eye className="h-4 w-4" /> View Profile
                            </Link>
                            <button
                              onClick={() => toggleWorkerStatus(worker)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"
                            >
                              <Power className="h-4 w-4" />
                              {worker.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => deleteWorker(worker.id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" /> Delete Worker
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddWorkerDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onCreated={fetchWorkers}
      />
    </div>
  );
}
