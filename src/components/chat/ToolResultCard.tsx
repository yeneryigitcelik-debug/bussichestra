"use client";

import { useState } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Users,
  Package,
  FolderKanban,
  Mail,
  FileText,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolCallInfo } from "@/hooks/useChat";

const TOOL_ICONS: Record<string, typeof DollarSign> = {
  get_revenue_summary: DollarSign,
  get_expense_summary: DollarSign,
  get_profit_loss: DollarSign,
  create_invoice: DollarSign,
  list_invoices: DollarSign,
  record_transaction: DollarSign,
  get_cash_flow: DollarSign,
  list_customers: Users,
  get_customer: Users,
  create_customer: Users,
  update_customer_stage: Users,
  get_pipeline_summary: Users,
  log_customer_interaction: Users,
  get_sales_forecast: Users,
  list_products: Package,
  get_product: Package,
  update_stock: Package,
  create_product: Package,
  get_inventory_alerts: Package,
  get_inventory_valuation: Package,
  list_projects: FolderKanban,
  create_project: FolderKanban,
  create_task: FolderKanban,
  update_task_status: FolderKanban,
  send_email: Mail,
  list_emails: Mail,
  get_email: Mail,
  list_documents: FileText,
  get_document: FileText,
};

const TOOL_COLORS: Record<string, string> = {
  DollarSign: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Users: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  Package: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  FolderKanban: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  Mail: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  FileText: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Zap: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
};

function getColorClass(toolName: string): string {
  const Icon = TOOL_ICONS[toolName] || Zap;
  return TOOL_COLORS[Icon.displayName || "Zap"] || TOOL_COLORS.Zap;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") {
    if (value >= 1000) return value.toLocaleString("tr-TR");
    return String(value);
  }
  if (typeof value === "boolean") return value ? "Evet" : "Hayır";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return `${value.length} öğe`;
  return JSON.stringify(value);
}

function ResultSummary({ result }: { result: unknown }) {
  if (!result || typeof result !== "object") {
    return <span className="text-sm text-muted-foreground">{String(result)}</span>;
  }

  const obj = result as Record<string, unknown>;

  // Show error state
  if (obj.error) {
    return (
      <div className="text-sm text-red-400">
        Hata: {String(obj.error)}
      </div>
    );
  }

  // Show success message
  if (obj.success && obj.message) {
    return (
      <div className="text-sm text-emerald-400">
        {String(obj.message)}
      </div>
    );
  }

  // Show key metrics
  const entries = Object.entries(obj).filter(
    ([key]) => !["success", "message"].includes(key) && typeof obj[key] !== "object"
  );

  const arrEntries = Object.entries(obj).filter(
    ([, val]) => Array.isArray(val)
  );

  return (
    <div className="space-y-1.5">
      {entries.slice(0, 4).map(([key, val]) => (
        <div key={key} className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
          <span className="font-medium text-foreground">{formatValue(val)}</span>
        </div>
      ))}
      {arrEntries.slice(0, 1).map(([key, val]) => {
        const arr = val as unknown[];
        return (
          <div key={key} className="mt-1">
            <span className="text-[11px] text-muted-foreground capitalize">{key.replace(/_/g, " ")} ({arr.length})</span>
            <div className="mt-1 space-y-1">
              {arr.slice(0, 3).map((item, i) => {
                if (typeof item === "object" && item !== null) {
                  const itemObj = item as Record<string, unknown>;
                  const label = itemObj.name || itemObj.category || itemObj.product || itemObj.stage || `#${i + 1}`;
                  const value = itemObj.amount || itemObj.total || itemObj.value || itemObj.count || itemObj.status;
                  return (
                    <div key={i} className="flex items-center justify-between text-xs rounded bg-secondary/50 px-2 py-1">
                      <span className="text-muted-foreground truncate max-w-[60%]">{String(label)}</span>
                      {value !== undefined && (
                        <span className="font-medium">{formatValue(value)}</span>
                      )}
                    </div>
                  );
                }
                return (
                  <div key={i} className="text-xs text-muted-foreground">{String(item)}</div>
                );
              })}
              {arr.length > 3 && (
                <div className="text-[11px] text-muted-foreground">+{arr.length - 3} daha...</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ToolResultCard({ toolCall }: { toolCall: ToolCallInfo }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TOOL_ICONS[toolCall.name] || Zap;
  const colorClass = getColorClass(toolCall.name);

  return (
    <div className={cn(
      "rounded-lg border px-3 py-2.5 transition-all",
      toolCall.status === "running" ? "border-yellow-500/30 bg-yellow-500/5" :
      toolCall.status === "error" ? "border-red-500/30 bg-red-500/5" :
      "border-border/50 bg-secondary/30"
    )}>
      {/* Header */}
      <button
        onClick={() => { if (toolCall.status !== "running") setExpanded(!expanded); }}
        className="flex w-full items-center gap-2.5"
        disabled={toolCall.status === "running"}
      >
        <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md border", colorClass)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-xs font-medium text-foreground">{toolCall.label}</span>
        </div>
        {toolCall.status === "running" && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-400" />
        )}
        {toolCall.status === "completed" && (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        )}
        {toolCall.status === "error" && (
          <AlertCircle className="h-3.5 w-3.5 text-red-400" />
        )}
        {toolCall.status !== "running" && (
          expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && toolCall.result != null ? (
        <div className="mt-2.5 border-t border-border/30 pt-2.5">
          <ResultSummary result={toolCall.result} />
        </div>
      ) : null}
    </div>
  );
}
