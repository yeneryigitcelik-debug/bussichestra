"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Receipt,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SkeletonCard, SkeletonTable } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";

/* ---------- Types ---------- */

interface FinanceSummary {
  revenue: number;
  expenses: number;
  netProfit: number;
  outstandingInvoices: number;
  outstandingCount: number;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: "income" | "expense";
  amount: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  total: number;
  status: "draft" | "sent" | "paid" | "overdue";
  due_date: string;
}

interface FinanceData {
  summary: FinanceSummary;
  transactions: Transaction[];
  invoices: Invoice[];
}

/* ---------- Helpers ---------- */

function formatCurrency(value: number): string {
  return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

const statusStyles: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
};

/* ---------- Component ---------- */

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [showTxDialog, setShowTxDialog] = useState(false);
  const [showInvDialog, setShowInvDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Transaction form
  const [txForm, setTxForm] = useState({
    description: "",
    amount: "",
    category: "Services",
    type: "income" as "income" | "expense",
  });

  // Invoice form
  const [invForm, setInvForm] = useState({
    customer_name: "",
    total: "",
    status: "draft" as "draft" | "sent" | "paid" | "overdue",
    due_date: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/finance");
      if (!res.ok) throw new Error("Failed to fetch finance data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* -- Submit Transaction -- */
  const handleSubmitTransaction = async () => {
    if (!txForm.description || !txForm.amount) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: txForm.description,
          amount: parseFloat(txForm.amount),
          category: txForm.category,
          type: txForm.type,
        }),
      });
      if (!res.ok) throw new Error("Failed to record transaction");
      setShowTxDialog(false);
      setTxForm({ description: "", amount: "", category: "Services", type: "income" });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  /* -- Submit Invoice -- */
  const handleSubmitInvoice = async () => {
    if (!invForm.customer_name || !invForm.total || !invForm.due_date) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: invForm.customer_name,
          total: parseFloat(invForm.total),
          status: invForm.status,
          due_date: invForm.due_date,
        }),
      });
      if (!res.ok) throw new Error("Failed to create invoice");
      setShowInvDialog(false);
      setInvForm({ customer_name: "", total: "", status: "draft", due_date: "" });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  /* -- Summary Cards Config -- */
  const summaryCards = data
    ? [
        {
          title: "Revenue",
          subtitle: "This month",
          value: formatCurrency(data.summary.revenue),
          icon: DollarSign,
          iconBg: "bg-emerald-500/10",
          iconColor: "text-emerald-400",
        },
        {
          title: "Expenses",
          subtitle: "This month",
          value: formatCurrency(data.summary.expenses),
          icon: TrendingDown,
          iconBg: "bg-red-500/10",
          iconColor: "text-red-400",
        },
        {
          title: "Net Profit",
          subtitle: "This month",
          value: formatCurrency(data.summary.netProfit),
          icon: TrendingUp,
          iconBg: "bg-blue-500/10",
          iconColor: "text-blue-400",
        },
        {
          title: "Outstanding Invoices",
          subtitle: `${data.summary.outstandingCount} invoice${data.summary.outstandingCount !== 1 ? "s" : ""} pending`,
          value: formatCurrency(data.summary.outstandingInvoices),
          icon: FileText,
          iconBg: "bg-yellow-500/10",
          iconColor: "text-yellow-400",
        },
      ]
    : [];

  /* ---------- Render ---------- */

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Finance</h1>
          <p className="text-sm text-muted-foreground">
            Manage your company&apos;s financial operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTxDialog(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Receipt className="h-4 w-4" />
            Record Transaction
          </button>
          <button
            onClick={() => setShowInvDialog(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary transition-colors"
          >
            <FileText className="h-4 w-4" />
            Create Invoice
          </button>
        </div>
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

          {/* Summary Cards */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {summaryCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.title}</p>
                      <p className="text-xs text-muted-foreground/60">{card.subtitle}</p>
                    </div>
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        card.iconBg
                      )}
                    >
                      <card.icon className={cn("h-5 w-5", card.iconColor)} />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-semibold">{card.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Recent Transactions */}
          {loading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : !data?.transactions.length ? (
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold">Recent Transactions</h2>
              </div>
              <EmptyState
                icon={Receipt}
                title="No transactions yet"
                description="Record your first transaction to start tracking finances."
                action={{ label: "Record Transaction", onClick: () => setShowTxDialog(true) }}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold">Recent Transactions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">Description</th>
                      <th className="px-5 py-3 font-medium">Category</th>
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-border/50 last:border-b-0"
                      >
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-muted-foreground">
                          {formatDate(tx.date)}
                        </td>
                        <td className="px-5 py-3 text-sm">{tx.description}</td>
                        <td className="px-5 py-3 text-sm text-muted-foreground">
                          {tx.category}
                        </td>
                        <td className="px-5 py-3 text-sm">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1",
                              tx.type === "income" ? "text-emerald-400" : "text-red-400"
                            )}
                          >
                            {tx.type === "income" ? (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDownRight className="h-3.5 w-3.5" />
                            )}
                            {tx.type === "income" ? "Income" : "Expense"}
                          </span>
                        </td>
                        <td
                          className={cn(
                            "whitespace-nowrap px-5 py-3 text-right text-sm font-medium",
                            tx.type === "income" ? "text-emerald-400" : "text-red-400"
                          )}
                        >
                          {tx.type === "expense"
                            ? `-${formatCurrency(tx.amount)}`
                            : formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Invoices */}
          {loading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : !data?.invoices.length ? (
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold">Invoices</h2>
              </div>
              <EmptyState
                icon={FileText}
                title="No invoices yet"
                description="Create your first invoice to start billing customers."
                action={{ label: "Create Invoice", onClick: () => setShowInvDialog(true) }}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold">Invoices</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Invoice #</th>
                      <th className="px-5 py-3 font-medium">Customer</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 text-right font-medium">Total</th>
                      <th className="px-5 py-3 text-right font-medium">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-b border-border/50 last:border-b-0"
                      >
                        <td className="whitespace-nowrap px-5 py-3 text-sm font-medium">
                          {inv.invoice_number}
                        </td>
                        <td className="px-5 py-3 text-sm">{inv.customer_name}</td>
                        <td className="px-5 py-3 text-sm">
                          <span
                            className={cn(
                              "inline-block rounded-md border px-2 py-0.5 text-xs capitalize",
                              statusStyles[inv.status]
                            )}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right text-sm font-medium">
                          {formatCurrency(inv.total)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right text-sm text-muted-foreground">
                          {formatDate(inv.due_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Record Transaction Dialog ---------- */}
      {showTxDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Record Transaction</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={txForm.description}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  placeholder="e.g. Client payment - Acme Corp"
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Type
                  </label>
                  <select
                    value={txForm.type}
                    onChange={(e) =>
                      setTxForm({ ...txForm, type: e.target.value as "income" | "expense" })
                    }
                    className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Category
                </label>
                <select
                  value={txForm.category}
                  onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Services">Services</option>
                  <option value="Operations">Operations</option>
                  <option value="Technology">Technology</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowTxDialog(false)}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitTransaction}
                disabled={submitting || !txForm.description || !txForm.amount}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving..." : "Save Transaction"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Create Invoice Dialog ---------- */}
      {showInvDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Create Invoice</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={invForm.customer_name}
                  onChange={(e) => setInvForm({ ...invForm, customer_name: e.target.value })}
                  placeholder="e.g. Acme Corp"
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Total ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={invForm.total}
                    onChange={(e) => setInvForm({ ...invForm, total: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </label>
                  <select
                    value={invForm.status}
                    onChange={(e) =>
                      setInvForm({
                        ...invForm,
                        status: e.target.value as "draft" | "sent" | "paid" | "overdue",
                      })
                    }
                    className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={invForm.due_date}
                  onChange={(e) => setInvForm({ ...invForm, due_date: e.target.value })}
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowInvDialog(false)}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitInvoice}
                disabled={submitting || !invForm.customer_name || !invForm.total || !invForm.due_date}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving..." : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
