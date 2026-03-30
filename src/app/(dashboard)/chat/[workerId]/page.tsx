"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatDataPanel } from "@/components/chat/ChatDataPanel";

interface WorkerInfo {
  id: string;
  name: string;
  role: string;
  department: string;
  status: string;
  settings?: { department_name?: string };
}

// Fallback for demo mode
const FALLBACK_WORKERS: Record<string, WorkerInfo> = {
  sophia: { id: "sophia", name: "Sophia", role: "Chief of Staff", department: "Executive", status: "active" },
  ayse: { id: "ayse", name: "Ayşe", role: "CFO", department: "Finance", status: "active" },
  marco: { id: "marco", name: "Marco", role: "Sales Director", department: "Sales", status: "active" },
  kenji: { id: "kenji", name: "Kenji", role: "Operations Manager", department: "Operations", status: "active" },
  elif: { id: "elif", name: "Elif", role: "HR Director", department: "Human Resources", status: "active" },
};

export default function WorkerChatPage() {
  const params = useParams();
  const workerId = params.workerId as string;
  const [worker, setWorker] = useState<WorkerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWorker() {
      try {
        const res = await fetch("/api/workers");
        if (res.ok) {
          const workers = await res.json();
          const found = Array.isArray(workers)
            ? workers.find((w: WorkerInfo) => w.id === workerId || w.id.toLowerCase() === workerId)
            : null;
          if (found) {
            setWorker({
              id: found.id,
              name: found.name,
              role: found.role,
              department: (found.settings as { department_name?: string })?.department_name || found.department || "General",
              status: found.status || "active",
            });
            setLoading(false);
            return;
          }
        }
      } catch {
        // fallback
      }
      // Fallback to hardcoded
      const fallback = FALLBACK_WORKERS[workerId];
      if (fallback) setWorker(fallback);
      setLoading(false);
    }
    loadWorker();
  }, [workerId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Worker not found</h2>
          <p className="text-sm text-muted-foreground">
            The worker &quot;{workerId}&quot; does not exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Main chat area */}
      <div className="flex-1 min-w-0">
        <ChatWindow
          workerId={workerId}
          workerName={worker.name}
          workerRole={`${worker.role} — ${worker.department}`}
        />
      </div>

      {/* Data panel - hidden on mobile */}
      <div className="hidden lg:block">
        <ChatDataPanel
          workerId={workerId}
          department={worker.department}
        />
      </div>
    </div>
  );
}
