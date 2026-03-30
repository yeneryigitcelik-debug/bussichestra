"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, MessageSquare, Crown, Save, Power, Trash2,
  Zap, Brain, Thermometer, Globe, Shield, Bot, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AI_MODELS, DEPARTMENTS } from "@/lib/constants";

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
  max_tokens: number;
  language: string;
  email: string | null;
  settings: Record<string, string>;
  department_name?: string;
  created_at: string;
}

const ALL_TOOLS = [
  // Finance
  { name: "get_revenue_summary", dept: "Finance", desc: "Revenue for a period" },
  { name: "get_expense_summary", dept: "Finance", desc: "Expenses for a period" },
  { name: "get_profit_loss", dept: "Finance", desc: "P&L statement" },
  { name: "create_invoice", dept: "Finance", desc: "Create invoices" },
  { name: "list_invoices", dept: "Finance", desc: "List invoices" },
  { name: "record_transaction", dept: "Finance", desc: "Record income/expense" },
  { name: "get_cash_flow", dept: "Finance", desc: "Cash flow analysis" },
  // CRM
  { name: "list_customers", dept: "Sales", desc: "List customers" },
  { name: "get_customer", dept: "Sales", desc: "Customer details" },
  { name: "create_customer", dept: "Sales", desc: "Create leads" },
  { name: "update_customer_stage", dept: "Sales", desc: "Move pipeline stage" },
  { name: "get_pipeline_summary", dept: "Sales", desc: "Pipeline overview" },
  { name: "log_customer_interaction", dept: "Sales", desc: "Log interactions" },
  { name: "get_sales_forecast", dept: "Sales", desc: "Sales forecast" },
  // Operations
  { name: "list_products", dept: "Operations", desc: "List products" },
  { name: "get_product", dept: "Operations", desc: "Product details" },
  { name: "update_stock", dept: "Operations", desc: "Update stock" },
  { name: "create_product", dept: "Operations", desc: "Add products" },
  { name: "get_inventory_alerts", dept: "Operations", desc: "Low stock alerts" },
  { name: "get_inventory_valuation", dept: "Operations", desc: "Inventory value" },
  // Projects
  { name: "list_projects", dept: "Projects", desc: "List projects" },
  { name: "create_project", dept: "Projects", desc: "Create projects" },
  { name: "create_task", dept: "Projects", desc: "Create tasks" },
  { name: "update_task_status", dept: "Projects", desc: "Update tasks" },
  // Email
  { name: "send_email", dept: "Email", desc: "Send emails" },
  { name: "list_emails", dept: "Email", desc: "List emails" },
  { name: "get_email", dept: "Email", desc: "Read emails" },
  // Documents
  { name: "list_documents", dept: "Documents", desc: "List documents" },
  { name: "get_document", dept: "Documents", desc: "Get document" },
  // Manager
  { name: "delegate_to_worker", dept: "Manager", desc: "Delegate tasks" },
  { name: "query_worker", dept: "Manager", desc: "Query a worker" },
  { name: "summarize_department", dept: "Manager", desc: "Department summary" },
  { name: "list_all_workers", dept: "Manager", desc: "All workers status" },
];

const toolDeptColors: Record<string, string> = {
  Finance: "border-emerald-500/30 text-emerald-400",
  Sales: "border-blue-500/30 text-blue-400",
  Operations: "border-orange-500/30 text-orange-400",
  Projects: "border-violet-500/30 text-violet-400",
  Email: "border-cyan-500/30 text-cyan-400",
  Documents: "border-gray-500/30 text-gray-400",
  Manager: "border-purple-500/30 text-purple-400",
};

export default function WorkerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workerId = params.id as string;

  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [persona, setPersona] = useState("");
  const [department, setDepartment] = useState("Finance");
  const [model, setModel] = useState<string>(AI_MODELS.WORKER);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [language, setLanguage] = useState("en");
  const [isManager, setIsManager] = useState(false);
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("profile");

  const fetchWorker = useCallback(async () => {
    try {
      const res = await fetch("/api/workers");
      const data = await res.json();
      const found = (data.workers || []).find((w: Worker) => w.id === workerId);
      if (found) {
        setWorker(found);
        setName(found.name);
        setRole(found.role);
        setPersona(found.persona);
        setDepartment(found.department_name || found.settings?.department_name || "Finance");
        setModel(found.model || AI_MODELS.WORKER);
        setTemperature(found.temperature ?? 0.7);
        setMaxTokens(found.max_tokens || 4096);
        setLanguage(found.language || "en");
        setIsManager(found.is_manager || false);
        setEnabledTools(found.tools || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => { fetchWorker(); }, [fetchWorker]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/workers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: workerId,
          name, role, persona,
          model, temperature, max_tokens: maxTokens,
          language, is_manager: isManager,
          tools: enabledTools,
          settings: { department_name: department },
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!worker) return;
    const newStatus = worker.status === "active" ? "offline" : "active";
    await fetch("/api/workers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: workerId, status: newStatus }),
    });
    setWorker({ ...worker, status: newStatus });
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${worker?.name}? This cannot be undone.`)) return;
    await fetch(`/api/workers?id=${workerId}`, { method: "DELETE" });
    router.push("/workers");
  };

  const toggleTool = (toolName: string) => {
    setEnabledTools((prev) =>
      prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName]
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Bot className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Worker not found</h2>
        <Link href="/workers" className="text-sm text-primary hover:underline">Back to Workers</Link>
      </div>
    );
  }

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "tools", label: `Tools (${enabledTools.length})` },
    { id: "settings", label: "Settings" },
    { id: "danger", label: "Danger Zone" },
  ];

  const groupedTools = ALL_TOOLS.reduce<Record<string, typeof ALL_TOOLS>>((acc, tool) => {
    if (!acc[tool.dept]) acc[tool.dept] = [];
    acc[tool.dept].push(tool);
    return acc;
  }, {});

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border bg-card px-6 py-4">
        <Link href="/workers" className="rounded-md p-1 text-muted-foreground hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="relative">
          <div className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold",
            isManager ? "bg-purple-500/20 text-purple-400" : "bg-secondary"
          )}>
            {isManager ? <Crown className="h-5 w-5" /> : name[0] || "?"}
          </div>
          <span className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card",
            worker.status === "active" ? "bg-green-500" : "bg-gray-500"
          )} />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{name}</h1>
          <p className="text-sm text-muted-foreground">{role} — {department}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/chat/${workerId}`}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary"
          >
            <MessageSquare className="h-4 w-4" /> Chat
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border px-6 pt-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">

          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Role / Title</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {Object.values(DEPARTMENTS).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Persona & Personality
                  <span className="ml-2 text-xs text-muted-foreground">
                    This is the system prompt that defines how the worker behaves
                  </span>
                </label>
                <textarea
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  rows={8}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <label className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-purple-400" />
                  <div>
                    <p className="text-sm font-medium">Manager Role</p>
                    <p className="text-xs text-muted-foreground">
                      Can delegate tasks, query other workers, and see cross-department data
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManager(!isManager)}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    isManager ? "bg-purple-500" : "bg-secondary"
                  )}
                >
                  <span className={cn(
                    "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                    isManager && "translate-x-5"
                  )} />
                </button>
              </label>
            </>
          )}

          {/* TOOLS TAB */}
          {activeTab === "tools" && (
            <>
              <p className="text-sm text-muted-foreground">
                Enable or disable tools this worker can use. Enabled tools appear as capabilities during conversations.
              </p>
              {Object.entries(groupedTools).map(([dept, tools]) => (
                <div key={dept}>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Zap className={cn("h-4 w-4", toolDeptColors[dept]?.split(" ")[1] || "text-muted-foreground")} />
                    {dept}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {tools.map((tool) => {
                      const enabled = enabledTools.includes(tool.name);
                      return (
                        <button
                          key={tool.name}
                          onClick={() => toggleTool(tool.name)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                            enabled
                              ? `${toolDeptColors[dept] || "border-border"} bg-secondary/50`
                              : "border-border text-muted-foreground hover:bg-secondary/30"
                          )}
                        >
                          <div className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
                            enabled ? "border-current bg-current/10" : "border-border"
                          )}>
                            <Zap className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{tool.name}</p>
                            <p className="truncate text-xs opacity-70">{tool.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <>
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                  <Brain className="h-4 w-4" /> AI Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value={AI_MODELS.WORKER}>Claude Sonnet — Fast, efficient, great for daily tasks</option>
                  <option value={AI_MODELS.MANAGER}>Claude Opus — Powerful, strategic, best for complex reasoning</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                  <Thermometer className="h-4 w-4" /> Creativity (Temperature): {temperature}
                </label>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 — Precise & deterministic</span>
                  <span>1 — Creative & varied</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                  <Zap className="h-4 w-4" /> Max Response Length: {maxTokens} tokens
                </label>
                <input
                  type="range" min="1024" max="8192" step="512"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1024 — Short responses</span>
                  <span>8192 — Detailed responses</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                  <Globe className="h-4 w-4" /> Primary Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="en">English</option>
                  <option value="tr">Turkish</option>
                  <option value="es">Spanish</option>
                  <option value="de">German</option>
                  <option value="fr">French</option>
                  <option value="pt">Portuguese</option>
                  <option value="ja">Japanese</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>
            </>
          )}

          {/* DANGER ZONE */}
          {activeTab === "danger" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
                <h3 className="flex items-center gap-2 font-semibold text-yellow-400">
                  <Power className="h-4 w-4" />
                  {worker.status === "active" ? "Deactivate Worker" : "Activate Worker"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {worker.status === "active"
                    ? "The worker will stop responding to messages and won't execute tasks."
                    : "Bring this worker back online."}
                </p>
                <button
                  onClick={handleToggleStatus}
                  className="mt-3 rounded-lg border border-yellow-500/30 px-4 py-2 text-sm font-medium text-yellow-400 hover:bg-yellow-500/10"
                >
                  {worker.status === "active" ? "Deactivate" : "Activate"}
                </button>
              </div>

              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <h3 className="flex items-center gap-2 font-semibold text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Delete Worker
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Permanently delete this worker and all their conversations, knowledge, and task history. This cannot be undone.
                </p>
                <button
                  onClick={handleDelete}
                  className="mt-3 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  Delete {worker.name} permanently
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
