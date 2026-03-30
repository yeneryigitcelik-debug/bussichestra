"use client";

import { useState, useEffect } from "react";
import { VirtualOffice } from "@/components/office/VirtualOffice";
import { DollarSign, Users, Package, AlertTriangle, Zap, Activity, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DashboardData {
  total_revenue: number;
  total_expenses: number;
  total_customers: number;
  total_products: number;
  active_workers: number;
  low_stock_count: number;
  recent_activity: {
    id: string;
    actor_name: string;
    action: string;
    entity_name: string;
    created_at: string;
  }[];
}

const ACTOR_COLORS: Record<string, string> = {
  Sophia: "text-purple-400", "Ayşe": "text-emerald-400", Ayse: "text-emerald-400",
  Marco: "text-blue-400", Kenji: "text-orange-400", Elif: "text-pink-400",
};

function formatCurrency(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) setData(await res.json());
    } catch { /* fallback */ }
  };

  const seedData = async () => {
    setSeeding(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      await fetchData();
    } catch { /* */ }
    setSeeding(false);
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, []);

  const revenue = data?.total_revenue ?? 0;
  const customers = data?.total_customers ?? 0;
  const products = data?.total_products ?? 0;
  const alerts = data?.low_stock_count ?? 0;
  const activity = data?.recent_activity || [];

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Full-screen Virtual Office */}
      <VirtualOffice />

      {/* KPI Overlay - top left */}
      <div className="absolute top-4 left-4 z-40 flex flex-col gap-2">
        {[
          { label: "Revenue", value: formatCurrency(revenue), icon: DollarSign, color: "text-emerald-400 bg-emerald-500/10", href: "/finance" },
          { label: "Customers", value: String(customers), icon: Users, color: "text-blue-400 bg-blue-500/10", href: "/crm" },
          { label: "Products", value: String(products), icon: Package, color: "text-orange-400 bg-orange-500/10", href: "/inventory" },
          { label: "Alerts", value: String(alerts), icon: AlertTriangle, color: alerts > 0 ? "text-red-400 bg-red-500/10" : "text-green-400 bg-green-500/10", href: "/inventory" },
        ].map((kpi) => (
          <Link key={kpi.label} href={kpi.href}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-card/90 backdrop-blur-sm px-3 py-2 shadow-lg transition-all hover:bg-card hover:shadow-xl group min-w-[160px]">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", kpi.color)}>
              <kpi.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            </div>
          </Link>
        ))}

        {/* Seed button */}
        <button onClick={seedData} disabled={seeding}
          className="flex items-center gap-2 rounded-xl border border-border bg-card/90 backdrop-blur-sm px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground transition-all shadow-lg disabled:opacity-50">
          <Zap className={cn("h-3.5 w-3.5", seeding && "animate-spin")} />
          {seeding ? "Seeding..." : "Seed Demo Data"}
        </button>
      </div>

      {/* Activity Feed - bottom left, collapsible */}
      <div className="absolute bottom-16 left-4 z-40">
        <button onClick={() => setShowActivity(!showActivity)}
          className="flex items-center gap-2 rounded-xl border border-border bg-card/90 backdrop-blur-sm px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground transition-all shadow-lg mb-2">
          <Activity className="h-3.5 w-3.5" />
          Activity Feed
          {activity.length > 0 && <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">{activity.length}</span>}
          {showActivity ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </button>

        {showActivity && activity.length > 0 && (
          <div className="w-80 rounded-xl border border-border bg-card/95 backdrop-blur-sm shadow-xl overflow-hidden animate-fade-in-up">
            <div className="max-h-60 overflow-y-auto scrollbar-thin divide-y divide-border/50">
              {activity.slice(0, 8).map((item, i) => (
                <div key={item.id || i} className="flex items-center gap-2.5 px-3 py-2">
                  <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-[10px] font-bold",
                    ACTOR_COLORS[item.actor_name] || "text-purple-400")}>
                    {item.actor_name?.[0] || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] leading-tight">
                      <span className={cn("font-semibold", ACTOR_COLORS[item.actor_name] || "text-purple-400")}>{item.actor_name}</span>
                      {" "}<span className="text-muted-foreground">{item.action} {item.entity_name}</span>
                    </p>
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0">{timeAgo(item.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
