"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkerAvatar } from "@/components/workers/WorkerAvatar";

interface WorkerInfo {
  id: string;
  name: string;
  role: string;
  department: string;
  status: string;
  is_manager: boolean;
  persona: string;
  settings?: { department_name?: string };
}

const FALLBACK_WORKERS: WorkerInfo[] = [
  { id: "sophia", name: "Sophia", role: "Chief of Staff", department: "Executive", status: "active", is_manager: true, persona: "Cross-department oversight, delegation, and strategic coordination" },
  { id: "ayse", name: "Ayşe", role: "CFO", department: "Finance", status: "active", is_manager: false, persona: "Revenue tracking, invoicing, expenses, P&L analysis, and cash flow" },
  { id: "marco", name: "Marco", role: "Sales Director", department: "Sales", status: "active", is_manager: false, persona: "Lead management, CRM, pipeline tracking, and sales forecasting" },
  { id: "kenji", name: "Kenji", role: "Operations Manager", department: "Operations", status: "active", is_manager: false, persona: "Inventory management, project tracking, and operational efficiency" },
  { id: "elif", name: "Elif", role: "HR Director", department: "Human Resources", status: "active", is_manager: false, persona: "Team management, policies, onboarding, and organizational health" },
];

const departmentStyles: Record<string, { badge: string }> = {
  Executive: { badge: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  Finance: { badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  Sales: { badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  Operations: { badge: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  "Human Resources": { badge: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  Kitchen: { badge: "bg-red-500/10 text-red-400 border-red-500/20" },
  Marketing: { badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  "Customer Success": { badge: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  Creative: { badge: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20" },
  "Project Management": { badge: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  "Business Development": { badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  Delivery: { badge: "bg-lime-500/10 text-lime-400 border-lime-500/20" },
  Research: { badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  Production: { badge: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  "Quality Control": { badge: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
};

export default function ChatListPage() {
  const [workers, setWorkers] = useState<WorkerInfo[]>(FALLBACK_WORKERS);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/workers");
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.workers;
          if (Array.isArray(list) && list.length > 0) {
            setWorkers(list.map((w: Record<string, unknown>) => {
              // Prisma (authenticated) returns department as { name: string } via include
              // Demo mode returns department_name as a flat string
              const dept = (w.department as { name?: string })?.name
                || (w as Record<string, unknown>).department_name as string
                || (w.settings as { department_name?: string })?.department_name
                || "General";
              return {
                id: String(w.id),
                name: String(w.name),
                role: String(w.role),
                department: dept,
                status: String(w.status || "active"),
                // Prisma returns isManager (camelCase), demo returns is_manager (snake_case)
                is_manager: Boolean(w.isManager ?? w.is_manager),
                persona: String(w.persona || ""),
              };
            }));
          }
        }
      } catch {
        // keep fallback
      }
    }
    load();
  }, []);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h1 className="text-xl font-semibold">Your Team</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a team member to start a conversation — they have access to your company data
        </p>
      </div>

      {/* Worker list */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="mx-auto max-w-2xl space-y-3">
          {workers.map((worker) => {
            const style = departmentStyles[worker.department] || { badge: "bg-gray-500/10 text-gray-400 border-gray-500/20" };
            return (
              <Link
                key={worker.id}
                href={`/chat/${worker.id}`}
                className={cn(
                  "group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all duration-200",
                  "hover:border-white/10 card-hover"
                )}
              >
                <div className="relative">
                  <WorkerAvatar workerId={worker.id} size="lg" showStatus={false} />
                  <span className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card shadow-sm",
                    worker.status === "active" ? "bg-green-400 shadow-green-400/50" :
                    worker.status === "idle" ? "bg-yellow-400" :
                    worker.status === "stuck" ? "bg-red-400" : "bg-gray-500"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold group-hover:text-gradient transition-colors">{worker.name}</h3>
                    <span className="rounded-md bg-secondary/80 px-2 py-0.5 text-xs text-muted-foreground">
                      {worker.role}
                    </span>
                    <span className={cn("rounded-md border px-2 py-0.5 text-xs", style.badge)}>
                      {worker.department}
                    </span>
                    {worker.is_manager && (
                      <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400">
                        Manager
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                    {worker.persona || `${worker.role} in ${worker.department}`}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
