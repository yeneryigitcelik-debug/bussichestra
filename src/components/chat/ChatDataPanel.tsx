"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, Users, Package, FolderKanban, TrendingUp, TrendingDown,
  AlertTriangle, BarChart3, RefreshCw, ChevronDown, ChevronRight, Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkerInbox } from "@/components/workers/WorkerInbox";

interface ChatDataPanelProps {
  workerId: string;
  department: string;
}

interface FinanceData {
  revenue_this_month: number;
  expenses_this_month: number;
  net_profit: number;
  outstanding_invoices_count: number;
  outstanding_invoices_total: number;
  recent_transactions: { id: string; description: string; amount: number; type: string; date: string }[];
  recent_invoices: { id: string; invoice_number: string; customer_name: string; total: number; status: string }[];
}

interface CRMData {
  total_customers: number;
  pipeline: { stage: string; count: number; total_value: number }[];
  top_customers: { id: string; name: string; stage: string; lifetime_value: number }[];
}

interface InventoryData {
  total_products: number;
  total_stock_value: number;
  low_stock_alerts: { id: string; name: string; quantity: number; reorder_at: number }[];
  products: { id: string; name: string; sku: string; quantity: number; price: number }[];
}

interface ProjectData {
  projects: { id: string; name: string; status: string; total_tasks: number; completed_tasks: number }[];
}

function formatCurrency(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function MiniStat({ label, value, icon: Icon, color, trend }: {
  label: string; value: string; icon: typeof DollarSign; color: string; trend?: "up" | "down";
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-secondary/40 p-2.5">
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-bold truncate">{value}</p>
      </div>
      {trend && (
        trend === "up"
          ? <TrendingUp className="h-3 w-3 shrink-0 text-emerald-400" />
          : <TrendingDown className="h-3 w-3 shrink-0 text-red-400" />
      )}
    </div>
  );
}

function CollapsibleSection({ title, defaultOpen = true, children }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {title}
      </button>
      {open && <div className="mt-1 space-y-1.5">{children}</div>}
    </div>
  );
}

const stageBadge: Record<string, string> = {
  lead: "bg-gray-500/10 text-gray-400",
  prospect: "bg-blue-500/10 text-blue-400",
  customer: "bg-emerald-500/10 text-emerald-400",
  churned: "bg-red-500/10 text-red-400",
};

const statusBadge: Record<string, string> = {
  planning: "bg-gray-500/10 text-gray-400",
  active: "bg-emerald-500/10 text-emerald-400",
  on_hold: "bg-yellow-500/10 text-yellow-400",
  completed: "bg-blue-500/10 text-blue-400",
};

const invoiceStatusBadge: Record<string, string> = {
  paid: "text-emerald-400",
  sent: "text-blue-400",
  draft: "text-gray-400",
  overdue: "text-red-400",
};

function FinancePanel({ data }: { data: FinanceData }) {
  return (
    <div className="space-y-3">
      <CollapsibleSection title="Overview">
        <MiniStat label="Revenue" value={formatCurrency(data.revenue_this_month)} icon={DollarSign} color="text-emerald-400 bg-emerald-500/10" trend="up" />
        <MiniStat label="Expenses" value={formatCurrency(data.expenses_this_month)} icon={TrendingDown} color="text-red-400 bg-red-500/10" />
        <MiniStat label="Net Profit" value={formatCurrency(data.net_profit)} icon={BarChart3} color="text-blue-400 bg-blue-500/10" trend={data.net_profit > 0 ? "up" : "down"} />
        <MiniStat label="Outstanding" value={`${data.outstanding_invoices_count} invoices`} icon={AlertTriangle} color="text-yellow-400 bg-yellow-500/10" />
      </CollapsibleSection>

      {data.recent_invoices?.length > 0 && (
        <CollapsibleSection title="Recent Invoices" defaultOpen={false}>
          {data.recent_invoices.slice(0, 5).map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-md bg-secondary/30 px-2.5 py-1.5 text-xs">
              <div className="min-w-0">
                <span className="font-medium">{inv.invoice_number}</span>
                <span className="ml-1 text-muted-foreground">{inv.customer_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={invoiceStatusBadge[inv.status] || "text-gray-400"}>{inv.status}</span>
                <span className="font-medium">{formatCurrency(inv.total)}</span>
              </div>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {data.recent_transactions?.length > 0 && (
        <CollapsibleSection title="Transactions" defaultOpen={false}>
          {data.recent_transactions.slice(0, 5).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between rounded-md bg-secondary/30 px-2.5 py-1.5 text-xs">
              <span className="truncate max-w-[60%] text-muted-foreground">{tx.description}</span>
              <span className={cn("font-medium", tx.type === "income" ? "text-emerald-400" : "text-red-400")}>
                {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
              </span>
            </div>
          ))}
        </CollapsibleSection>
      )}
    </div>
  );
}

function CRMPanel({ data }: { data: CRMData }) {
  return (
    <div className="space-y-3">
      <CollapsibleSection title="Pipeline">
        <MiniStat label="Total Customers" value={String(data.total_customers)} icon={Users} color="text-blue-400 bg-blue-500/10" />
        {data.pipeline?.map((stage) => (
          <div key={stage.stage} className="flex items-center justify-between rounded-md bg-secondary/30 px-2.5 py-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium capitalize", stageBadge[stage.stage] || "bg-gray-500/10 text-gray-400")}>
                {stage.stage}
              </span>
              <span className="text-muted-foreground">{stage.count}</span>
            </div>
            <span className="font-medium">{formatCurrency(stage.total_value)}</span>
          </div>
        ))}
      </CollapsibleSection>

      {data.top_customers?.length > 0 && (
        <CollapsibleSection title="Top Customers" defaultOpen={false}>
          {data.top_customers.slice(0, 5).map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-md bg-secondary/30 px-2.5 py-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{c.name}</span>
                <span className={cn("rounded px-1 py-0.5 text-[9px] capitalize", stageBadge[c.stage] || "")}>{c.stage}</span>
              </div>
              <span className="text-emerald-400 font-medium">{formatCurrency(c.lifetime_value)}</span>
            </div>
          ))}
        </CollapsibleSection>
      )}
    </div>
  );
}

function InventoryPanel({ data }: { data: InventoryData }) {
  return (
    <div className="space-y-3">
      <CollapsibleSection title="Overview">
        <MiniStat label="Products" value={String(data.total_products)} icon={Package} color="text-orange-400 bg-orange-500/10" />
        <MiniStat label="Stock Value" value={formatCurrency(data.total_stock_value)} icon={DollarSign} color="text-emerald-400 bg-emerald-500/10" />
        {data.low_stock_alerts?.length > 0 && (
          <MiniStat label="Low Stock Alerts" value={String(data.low_stock_alerts.length)} icon={AlertTriangle} color="text-red-400 bg-red-500/10" />
        )}
      </CollapsibleSection>

      {data.low_stock_alerts?.length > 0 && (
        <CollapsibleSection title="Low Stock">
          {data.low_stock_alerts.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md bg-red-500/5 border border-red-500/10 px-2.5 py-1.5 text-xs">
              <span className="font-medium">{p.name}</span>
              <span className="text-red-400">{p.quantity}/{p.reorder_at}</span>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {data.products?.length > 0 && (
        <CollapsibleSection title="Products" defaultOpen={false}>
          {data.products.slice(0, 8).map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md bg-secondary/30 px-2.5 py-1.5 text-xs">
              <div>
                <span className="font-medium">{p.name}</span>
                <span className="ml-1 text-muted-foreground">{p.sku}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">×{p.quantity}</span>
                <span className="font-medium">{formatCurrency(p.price)}</span>
              </div>
            </div>
          ))}
        </CollapsibleSection>
      )}
    </div>
  );
}

function ProjectsPanel({ data }: { data: ProjectData }) {
  return (
    <div className="space-y-3">
      <CollapsibleSection title="Projects">
        {data.projects?.map((p) => {
          const pct = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
          return (
            <div key={p.id} className="rounded-md bg-secondary/30 px-2.5 py-2 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium">{p.name}</span>
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] capitalize", statusBadge[p.status] || "bg-gray-500/10 text-gray-400")}>
                  {p.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-muted-foreground text-[10px]">{pct}%</span>
              </div>
              <span className="text-muted-foreground">{p.completed_tasks}/{p.total_tasks} tasks</span>
            </div>
          );
        })}
        {(!data.projects || data.projects.length === 0) && (
          <p className="text-xs text-muted-foreground py-2">No active projects</p>
        )}
      </CollapsibleSection>
    </div>
  );
}

function ExecutivePanel({ finance, crm }: { finance: FinanceData | null; crm: CRMData | null }) {
  return (
    <div className="space-y-3">
      {finance && (
        <CollapsibleSection title="Finance">
          <MiniStat label="Revenue" value={formatCurrency(finance.revenue_this_month)} icon={DollarSign} color="text-emerald-400 bg-emerald-500/10" trend="up" />
          <MiniStat label="Net Profit" value={formatCurrency(finance.net_profit)} icon={BarChart3} color="text-blue-400 bg-blue-500/10" trend={finance.net_profit > 0 ? "up" : "down"} />
        </CollapsibleSection>
      )}
      {crm && (
        <CollapsibleSection title="Sales">
          <MiniStat label="Customers" value={String(crm.total_customers)} icon={Users} color="text-blue-400 bg-blue-500/10" />
          {crm.pipeline?.slice(0, 3).map((s) => (
            <div key={s.stage} className="flex items-center justify-between rounded-md bg-secondary/30 px-2.5 py-1.5 text-xs">
              <span className={cn("rounded px-1.5 py-0.5 capitalize", stageBadge[s.stage] || "")}>{s.stage}</span>
              <span className="font-medium">{s.count} · {formatCurrency(s.total_value)}</span>
            </div>
          ))}
        </CollapsibleSection>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 py-2 text-xs font-medium transition-colors",
        active ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

export function ChatDataPanel({ workerId, department }: ChatDataPanelProps) {
  const [activeTab, setActiveTab] = useState<"data" | "inbox">("data");
  const [financeData, setFinanceData] = useState<FinanceData | null>(null);
  const [crmData, setCrmData] = useState<CRMData | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const dept = department.toLowerCase();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Try worker-specific data endpoint first
      const workerDataRes = await fetch(`/api/workers/${workerId}/data`);
      if (workerDataRes.ok) {
        const workerData = await workerDataRes.json();
        const d = workerData.data;
        if (d) {
          // Map worker data to panel state
          if (d.revenue_this_month !== undefined) {
            setFinanceData({
              revenue_this_month: d.revenue_this_month || 0,
              expenses_this_month: d.expenses_this_month || 0,
              net_profit: d.net_profit || 0,
              outstanding_invoices_count: d.outstanding_invoices_count || 0,
              outstanding_invoices_total: d.outstanding_invoices_total || 0,
              recent_transactions: d.recent_transactions || [],
              recent_invoices: d.invoices || d.recent_invoices || [],
            });
          }
          if (d.pipeline_stages || d.total_customers !== undefined) {
            setCrmData({
              total_customers: d.total_customers || 0,
              pipeline: d.pipeline_stages || [],
              top_customers: d.top_customers || [],
            });
          }
          if (d.products || d.total_products !== undefined) {
            setInventoryData({
              total_products: d.total_products || 0,
              total_stock_value: d.total_stock_value || 0,
              low_stock_alerts: d.low_stock_alerts || [],
              products: d.products || [],
            });
          }
          if (d.all_projects || d.active_projects) {
            setProjectData({
              projects: d.all_projects || d.active_projects || [],
            });
          }
          setLastUpdated(new Date());
          setLoading(false);
          return;
        }
      }

      // Fallback: fetch from individual endpoints
      if (dept.includes("finance") || dept.includes("executive")) {
        const res = await fetch("/api/finance");
        if (res.ok) setFinanceData(await res.json());
      }
      if (dept.includes("sales") || dept.includes("executive") || dept.includes("crm")) {
        const res = await fetch("/api/crm");
        if (res.ok) setCrmData(await res.json());
      }
      if (dept.includes("operations") || dept.includes("production") || dept.includes("kitchen") || dept.includes("executive")) {
        const res = await fetch("/api/inventory");
        if (res.ok) setInventoryData(await res.json());
      }
      const projRes = await fetch("/api/projects");
      if (projRes.ok) setProjectData(await projRes.json());

      setLastUpdated(new Date());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [dept, workerId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !financeData && !crmData && !inventoryData) {
    return (
      <div className="w-72 shrink-0 border-l border-border bg-card/50 p-4">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg bg-secondary/40 h-12" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 shrink-0 border-l border-border bg-card/50 overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Data Panel
        </h3>
        <button
          onClick={fetchData}
          className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          title="Refresh"
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-border">
        <TabButton active={activeTab === "data"} onClick={() => setActiveTab("data")} label="Data" />
        <TabButton active={activeTab === "inbox"} onClick={() => setActiveTab("inbox")} label="Inbox" />
      </div>

      {activeTab === "data" && (
        <div className="p-3 space-y-4">
          {dept.includes("executive") && (
            <ExecutivePanel finance={financeData} crm={crmData} />
          )}

          {dept.includes("finance") && financeData && (
            <FinancePanel data={financeData} />
          )}

          {(dept.includes("sales") || dept.includes("crm")) && crmData && (
            <CRMPanel data={crmData} />
          )}

          {(dept.includes("operations") || dept.includes("production") || dept.includes("kitchen")) && inventoryData && (
            <InventoryPanel data={inventoryData} />
          )}

          {projectData && projectData.projects?.length > 0 && (
            <ProjectsPanel data={projectData} />
          )}

          {lastUpdated && (
            <p className="text-[10px] text-muted-foreground/50 text-center pt-2">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      {activeTab === "inbox" && (
        <WorkerInbox workerId={workerId} workerName="" compact />
      )}
    </div>
  );
}
