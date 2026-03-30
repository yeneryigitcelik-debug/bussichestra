import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      incomeTransactions,
      expenseTransactions,
      outstandingInvoices,
      recentTransactions,
      recentInvoices,
    ] = await Promise.all([
      // Revenue this month
      prisma.transaction.findMany({
        where: {
          orgId,
          type: "income",
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { amount: true },
      }),

      // Expenses this month
      prisma.transaction.findMany({
        where: {
          orgId,
          type: "expense",
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { amount: true },
      }),

      // Outstanding invoices (sent or overdue)
      prisma.invoice.findMany({
        where: {
          orgId,
          status: { in: ["sent", "overdue"] },
        },
        select: { id: true, total: true },
      }),

      // Recent transactions (latest 10)
      prisma.transaction.findMany({
        where: { orgId },
        orderBy: { date: "desc" },
        take: 10,
      }),

      // Recent invoices (latest 10) with customer name
      prisma.invoice.findMany({
        where: { orgId },
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const revenueThisMonth = incomeTransactions.reduce(
      (sum, t) => sum + Number(t.amount ?? 0),
      0
    );
    const expensesThisMonth = expenseTransactions.reduce(
      (sum, t) => sum + Number(t.amount ?? 0),
      0
    );

    const outstandingTotal = outstandingInvoices.reduce(
      (sum, inv) => sum + Number(inv.total ?? 0),
      0
    );

    return NextResponse.json({
      revenue_this_month: revenueThisMonth,
      expenses_this_month: expensesThisMonth,
      net_profit: revenueThisMonth - expensesThisMonth,
      outstanding_invoices: {
        count: outstandingInvoices.length,
        total: outstandingTotal,
      },
      recent_transactions: recentTransactions,
      recent_invoices: recentInvoices,
    });
  } catch (err) {
    console.error("Finance API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch finance data" },
      { status: 500 }
    );
  }
}
