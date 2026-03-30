import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Finance — transactions, invoices, summaries
// ---------------------------------------------------------------------------

// ── Period helpers ──────────────────────────────────────────────────────────

function periodToDateRange(period?: string): { gte: Date; lte: Date } {
  const now = new Date();
  const lte = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let gte: Date;

  switch (period) {
    case "today":
      gte = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "this_week": {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday = 0
      gte = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
      break;
    }
    case "this_quarter": {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      gte = new Date(now.getFullYear(), qMonth, 1);
      break;
    }
    case "this_year":
      gte = new Date(now.getFullYear(), 0, 1);
      break;
    case "this_month":
    default:
      gte = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  return { gte, lte };
}

// ── Revenue / Expense / P&L / Cash flow ─────────────────────────────────────

export async function getRevenueSummary(orgId: string, period?: string) {
  const { gte, lte } = periodToDateRange(period);

  const result = await prisma.transaction.aggregate({
    where: { orgId, type: "income", date: { gte, lte } },
    _sum: { amount: true },
    _count: true,
  });

  return {
    total: Number(result._sum.amount ?? 0),
    count: result._count,
    period: period ?? "this_month",
  };
}

export async function getExpenseSummary(orgId: string, period?: string) {
  const { gte, lte } = periodToDateRange(period);

  const result = await prisma.transaction.aggregate({
    where: { orgId, type: "expense", date: { gte, lte } },
    _sum: { amount: true },
    _count: true,
  });

  return {
    total: Number(result._sum.amount ?? 0),
    count: result._count,
    period: period ?? "this_month",
  };
}

export async function getProfitLoss(orgId: string, period?: string) {
  const [revenue, expenses] = await Promise.all([
    getRevenueSummary(orgId, period),
    getExpenseSummary(orgId, period),
  ]);

  return {
    revenue: revenue.total,
    expenses: expenses.total,
    profit: revenue.total - expenses.total,
    margin: revenue.total > 0 ? ((revenue.total - expenses.total) / revenue.total) * 100 : 0,
    period: period ?? "this_month",
  };
}

export async function getCashFlow(orgId: string, period?: string) {
  const { gte, lte } = periodToDateRange(period);

  const transactions = await prisma.transaction.findMany({
    where: { orgId, date: { gte, lte } },
    orderBy: { date: "asc" },
    select: { type: true, amount: true, date: true, category: true },
  });

  let inflow = 0;
  let outflow = 0;

  for (const tx of transactions) {
    const amount = Number(tx.amount);
    if (tx.type === "income") {
      inflow += amount;
    } else {
      outflow += amount;
    }
  }

  return {
    inflow,
    outflow,
    net: inflow - outflow,
    transactionCount: transactions.length,
    period: period ?? "this_month",
  };
}

// ── Transactions ────────────────────────────────────────────────────────────

export async function getTransactions(
  orgId: string,
  filters?: {
    type?: string;
    category?: string;
    limit?: number;
    offset?: number;
  },
) {
  const where: Prisma.TransactionWhereInput = {
    orgId,
    ...(filters?.type ? { type: filters.type } : {}),
    ...(filters?.category ? { category: filters.category } : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions: transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
    })),
    total,
  };
}

export async function createTransaction(
  orgId: string,
  data: {
    type: string;
    amount: number;
    category?: string;
    currency?: string;
    description?: string;
    customerId?: string;
    invoiceId?: string;
    paymentMethod?: string;
    referenceNumber?: string;
    isRecurring?: boolean;
    date?: Date;
  },
) {
  return prisma.transaction.create({
    data: {
      orgId,
      type: data.type,
      amount: new Prisma.Decimal(data.amount),
      category: data.category,
      currency: data.currency ?? "USD",
      description: data.description,
      customerId: data.customerId,
      invoiceId: data.invoiceId,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber,
      isRecurring: data.isRecurring ?? false,
      date: data.date ?? new Date(),
    },
  });
}

// ── Invoices ────────────────────────────────────────────────────────────────

export async function getInvoices(
  orgId: string,
  filters?: {
    status?: string;
    customerId?: string;
    limit?: number;
    offset?: number;
  },
) {
  const where: Prisma.InvoiceWhereInput = {
    orgId,
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.customerId ? { customerId: filters.customerId } : {}),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    invoices: invoices.map((inv) => ({
      ...inv,
      subtotal: Number(inv.subtotal),
      taxRate: Number(inv.taxRate),
      taxAmount: Number(inv.taxAmount),
      discountAmount: Number(inv.discountAmount),
      total: Number(inv.total),
      items: inv.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        taxRate: Number(item.taxRate),
        total: Number(item.total),
      })),
    })),
    total,
  };
}

export async function createInvoice(
  orgId: string,
  data: {
    customerId?: string;
    invoiceNumber: string;
    type?: string;
    status?: string;
    currency?: string;
    subtotal?: number;
    taxRate?: number;
    taxAmount?: number;
    discountAmount?: number;
    total?: number;
    notes?: string;
    dueDate?: Date;
    createdBy?: string;
    items?: Array<{
      description: string;
      quantity?: number;
      unitPrice: number;
      taxRate?: number;
      total: number;
      productId?: string;
      sortOrder?: number;
    }>;
  },
) {
  return prisma.invoice.create({
    data: {
      orgId,
      customerId: data.customerId,
      invoiceNumber: data.invoiceNumber,
      type: data.type ?? "invoice",
      status: data.status ?? "draft",
      currency: data.currency ?? "USD",
      subtotal: new Prisma.Decimal(data.subtotal ?? 0),
      taxRate: new Prisma.Decimal(data.taxRate ?? 0),
      taxAmount: new Prisma.Decimal(data.taxAmount ?? 0),
      discountAmount: new Prisma.Decimal(data.discountAmount ?? 0),
      total: new Prisma.Decimal(data.total ?? 0),
      notes: data.notes,
      dueDate: data.dueDate,
      createdBy: data.createdBy,
      items: data.items
        ? {
            create: data.items.map((item, idx) => ({
              description: item.description,
              quantity: new Prisma.Decimal(item.quantity ?? 1),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              taxRate: new Prisma.Decimal(item.taxRate ?? 0),
              total: new Prisma.Decimal(item.total),
              productId: item.productId,
              sortOrder: item.sortOrder ?? idx,
            })),
          }
        : undefined,
    },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      items: true,
    },
  });
}

// ── Combined finance summary (dashboard) ────────────────────────────────────

export async function getFinanceSummary(orgId: string) {
  const [revenue, expenses, cashFlow, invoiceCounts] = await Promise.all([
    getRevenueSummary(orgId, "this_month"),
    getExpenseSummary(orgId, "this_month"),
    getCashFlow(orgId, "this_month"),
    prisma.invoice.groupBy({
      by: ["status"],
      where: { orgId },
      _count: true,
      _sum: { total: true },
    }),
  ]);

  const invoicesByStatus: Record<string, { count: number; total: number }> = {};
  for (const row of invoiceCounts) {
    invoicesByStatus[row.status] = {
      count: row._count,
      total: Number(row._sum.total ?? 0),
    };
  }

  return {
    revenue: revenue.total,
    expenses: expenses.total,
    profit: revenue.total - expenses.total,
    cashFlow: cashFlow.net,
    invoicesByStatus,
  };
}
