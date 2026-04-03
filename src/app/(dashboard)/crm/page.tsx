"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Users,
  TrendingUp,
  Search,
  Plus,
  X,
  UserPlus,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SkeletonCard, SkeletonTable } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";

/* ---------- Types ---------- */

interface PipelineStage {
  stage: string;
  count: number;
  total_value: number;
}

interface PipelineStageConfig {
  id: string;
  label: string;
  color: string;
  description: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  stage: "lead" | "prospect" | "customer" | "churned";
  lifetimeValue: number;
  lastContactAt: string | null;
  phone?: string;
  notes?: string;
}

/* ---------- Helpers ---------- */

function formatCurrency(value: number): string {
  return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

const stageBadgeStyles: Record<string, string> = {
  lead: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  prospect: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  customer: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  churned: "bg-red-500/10 text-red-400 border-red-500/20",
};

const stageCardConfig: Record<
  string,
  { icon: typeof Users; color: string; bg: string; borderColor: string }
> = {
  lead: { icon: UserPlus, color: "text-gray-400", bg: "bg-gray-500/10", borderColor: "border-gray-500/20" },
  prospect: { icon: Users, color: "text-blue-400", bg: "bg-blue-500/10", borderColor: "border-blue-500/20" },
  customer: { icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
  churned: { icon: UserX, color: "text-red-400", bg: "bg-red-500/10", borderColor: "border-red-500/20" },
};

const DEFAULT_STAGE_ORDER = ["lead", "prospect", "customer", "churned"];

/* ---------- Component ---------- */

export default function CRMPage() {
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStageConfig[]>([]);
  const [industry, setIndustry] = useState<string>("default");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStageFilter, setActiveStageFilter] = useState<string>("all");

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    email: "",
    company: "",
    stage: "lead" as "lead" | "prospect" | "customer" | "churned",
    phone: "",
    notes: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [pipelineRes, customersRes] = await Promise.all([
        fetch("/api/crm"),
        fetch("/api/crm/customers"),
      ]);
      if (!pipelineRes.ok) throw new Error("Failed to fetch pipeline data");
      if (!customersRes.ok) throw new Error("Failed to fetch customers");
      const pipelineData = await pipelineRes.json();
      const customersData = await customersRes.json();
      setPipeline(pipelineData.pipeline ?? pipelineData);
      if (pipelineData.pipeline_stages) setPipelineStages(pipelineData.pipeline_stages);
      if (pipelineData.industry) setIndustry(pipelineData.industry);
      setCustomers(customersData.customers ?? customersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* -- Submit Customer -- */
  const handleSubmitCustomer = async () => {
    if (!customerForm.name || !customerForm.email) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/crm/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerForm),
      });
      if (!res.ok) throw new Error("Failed to add customer");
      setShowAddDialog(false);
      setCustomerForm({ name: "", email: "", company: "", stage: "lead", phone: "", notes: "" });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  /* -- Filtered customers -- */
  const filteredCustomers = customers.filter((c) => {
    const matchesStage = activeStageFilter === "all" || c.stage === activeStageFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q);
    return matchesStage && matchesSearch;
  });

  /* -- Ordered pipeline cards -- */
  const stageOrder = pipelineStages.length > 0
    ? pipelineStages.map((s) => s.id)
    : DEFAULT_STAGE_ORDER;

  const orderedPipeline = stageOrder.map((stage) => {
    const found = pipeline.find((p) => p.stage === stage);
    return found ?? { stage, count: 0, total_value: 0 };
  });

  // Build dynamic stage labels from config
  const stageLabels: Record<string, string> = {};
  for (const s of pipelineStages) {
    stageLabels[s.id] = s.label;
  }

  /* ---------- Render ---------- */

  const stageTabs = [
    { key: "all", label: "All" },
    ...stageOrder.map((s) => ({ key: s, label: stageLabels[s] || s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") })),
  ];

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">CRM</h1>
          <p className="text-sm text-muted-foreground">
            Track your customers and sales pipeline
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Error banner */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Pipeline Stage Cards */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {orderedPipeline.map((stage) => {
                const config = stageCardConfig[stage.stage] ?? stageCardConfig.lead;
                const Icon = config.icon;
                return (
                  <div
                    key={stage.stage}
                    className={cn(
                      "rounded-xl border bg-card p-5",
                      config.borderColor
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground capitalize">
                        {stage.stage}
                      </span>
                      <div className={cn("rounded-lg p-2", config.bg)}>
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold">{stage.count}</p>
                      <p className={cn("mt-1 text-sm", config.color)}>
                        {formatCurrency(stage.total_value)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search + Filter */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers..."
                className="w-full rounded-lg border border-border bg-secondary/50 pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Stage tabs */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
              {stageTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveStageFilter(tab.key)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    activeStageFilter === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Table */}
          {loading ? (
            <SkeletonTable rows={6} cols={6} />
          ) : !filteredCustomers.length ? (
            <div className="rounded-xl border border-border bg-card">
              <EmptyState
                icon={Users}
                title={searchQuery || activeStageFilter !== "all" ? "No customers match your filters" : "No customers yet"}
                description={
                  searchQuery || activeStageFilter !== "all"
                    ? "Try adjusting your search or filter."
                    : "Add your first customer to start building your pipeline."
                }
                action={
                  !searchQuery && activeStageFilter === "all"
                    ? { label: "Add Customer", onClick: () => setShowAddDialog(true) }
                    : undefined
                }
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border px-6 py-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">
                  Customers
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({filteredCustomers.length})
                  </span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Name</th>
                      <th className="px-6 py-3 font-medium">Email</th>
                      <th className="px-6 py-3 font-medium">Company</th>
                      <th className="px-6 py-3 font-medium">Stage</th>
                      <th className="px-6 py-3 font-medium text-right">Lifetime Value</th>
                      <th className="px-6 py-3 font-medium">Last Contact</th>
                      <th className="px-6 py-3 font-medium w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <>
                        <tr
                          key={customer.id}
                          onClick={() =>
                            setExpandedId(expandedId === customer.id ? null : customer.id)
                          }
                          className="border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/50 cursor-pointer"
                        >
                          <td className="px-6 py-4 font-medium">{customer.name}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {customer.email}
                          </td>
                          <td className="px-6 py-4 text-sm">{customer.company}</td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
                                stageBadgeStyles[customer.stage]
                              )}
                            >
                              {customer.stage}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-sm tabular-nums">
                            {Number(customer.lifetimeValue) > 0
                              ? formatCurrency(Number(customer.lifetimeValue))
                              : "\u2014"}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {customer.lastContactAt ? formatDate(customer.lastContactAt) : "\u2014"}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {expandedId === customer.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </td>
                        </tr>
                        {expandedId === customer.id && (
                          <tr key={`${customer.id}-detail`} className="border-b border-border/50">
                            <td colSpan={7} className="px-6 py-4 bg-secondary/30">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">Phone</p>
                                  <p>{customer.phone || "\u2014"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">Stage</p>
                                  <p className="capitalize">{customer.stage}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">Lifetime Value</p>
                                  <p>
                                    {customer.lifetimeValue > 0
                                      ? formatCurrency(customer.lifetimeValue)
                                      : "\u2014"}
                                  </p>
                                </div>
                                {customer.notes && (
                                  <div className="sm:col-span-3">
                                    <p className="text-muted-foreground text-xs mb-1">Notes</p>
                                    <p className="text-muted-foreground">{customer.notes}</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Add Customer Dialog ---------- */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Add Customer</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder="e.g. Elena Vasquez"
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  placeholder="e.g. elena@company.com"
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={customerForm.company}
                    onChange={(e) => setCustomerForm({ ...customerForm, company: e.target.value })}
                    placeholder="e.g. Acme Corp"
                    className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Stage
                  </label>
                  <select
                    value={customerForm.stage}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        stage: e.target.value as "lead" | "prospect" | "customer" | "churned",
                      })
                    }
                    className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="lead">Lead</option>
                    <option value="prospect">Prospect</option>
                    <option value="customer">Customer</option>
                    <option value="churned">Churned</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  placeholder="e.g. +1 555-0123"
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                  placeholder="Any additional context..."
                  rows={3}
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddDialog(false)}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCustomer}
                disabled={submitting || !customerForm.name || !customerForm.email}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving..." : "Add Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
