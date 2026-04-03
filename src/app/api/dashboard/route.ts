import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

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
      customersCount,
      productsCount,
      activeWorkersCount,
      pendingApprovalsCount,
      recentActivity,
      lowStockProducts,
    ] = await Promise.all([
      // Total revenue this month
      prisma.transaction.findMany({
        where: {
          orgId,
          type: "income",
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { amount: true },
      }),

      // Total expenses this month
      prisma.transaction.findMany({
        where: {
          orgId,
          type: "expense",
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { amount: true },
      }),

      // Total customers
      prisma.customer.count({ where: { orgId } }),

      // Total products
      prisma.product.count({ where: { orgId } }),

      // Active workers
      prisma.aiWorker.count({ where: { orgId, status: "active" } }),

      // Pending approvals
      prisma.approvalRequest.count({ where: { orgId, status: "pending" } }),

      // Recent activity (latest 10)
      prisma.activityLog.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // Low stock products
      prisma.product.findMany({
        where: { orgId },
        select: { id: true, quantity: true, reorderAt: true },
      }),
    ]);

    const totalRevenue = incomeTransactions.reduce(
      (sum, t) => sum + Number(t.amount ?? 0),
      0
    );
    const totalExpenses = expenseTransactions.reduce(
      (sum, t) => sum + Number(t.amount ?? 0),
      0
    );
    const lowStockCount = lowStockProducts.filter(
      (p) => p.quantity != null && p.reorderAt != null && p.quantity <= p.reorderAt
    ).length;

    return NextResponse.json({
      totalRevenue,
      totalExpenses,
      totalCustomers: customersCount,
      totalProducts: productsCount,
      activeWorkers: activeWorkersCount,
      pendingApprovals: pendingApprovalsCount,
      recentActivity,
      lowStockCount: lowStockCount,
    });
  } catch (err) {
    console.error("Dashboard API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
