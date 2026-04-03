import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workerId } = await params;
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    // Load the worker
    const worker = await prisma.aiWorker.findFirst({
      where: { id: workerId, orgId },
      select: { id: true, name: true, role: true, settings: true, isManager: true },
    });

    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    const department = (worker.settings as Record<string, string>)?.department_name || "General";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};

    // ----------------------------------------------------------------
    // Finance data
    // ----------------------------------------------------------------
    if (department === "Finance" || department === "Executive") {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const today = now;

      // Revenue this month
      const incomeRows = await prisma.transaction.findMany({
        where: { orgId, type: "income", date: { gte: firstOfMonth, lte: today } },
        select: { amount: true },
      });
      const revenueThisMonth = incomeRows.reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

      // Expenses this month
      const expenseRows = await prisma.transaction.findMany({
        where: { orgId, type: "expense", date: { gte: firstOfMonth, lte: today } },
        select: { amount: true },
      });
      const expensesThisMonth = expenseRows.reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

      // Recent transactions
      const recentTransactions = await prisma.transaction.findMany({
        where: { orgId },
        orderBy: { date: "desc" },
        take: 10,
      });

      // Recent invoices with customer name
      const recentInvoices = await prisma.invoice.findMany({
        where: { orgId },
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      // Outstanding invoices
      const outstandingInvoices = await prisma.invoice.findMany({
        where: { orgId, status: { in: ["sent", "overdue"] } },
        select: { id: true, total: true },
      });

      const outstandingCount = outstandingInvoices.length;
      const outstandingTotal = outstandingInvoices.reduce(
        (sum, inv) => sum + Number(inv.total ?? 0), 0
      );

      data.finance = {
        revenue_this_month: revenueThisMonth,
        expenses_this_month: expensesThisMonth,
        net_profit: revenueThisMonth - expensesThisMonth,
        recent_transactions: recentTransactions,
        invoices: recentInvoices,
        outstanding_invoices_count: outstandingCount,
        outstanding_invoices_total: outstandingTotal,
        cash_flow: {
          inflows: revenueThisMonth,
          outflows: expensesThisMonth,
          net: revenueThisMonth - expensesThisMonth,
        },
      };
    }

    // ----------------------------------------------------------------
    // Sales data
    // ----------------------------------------------------------------
    if (department === "Sales" || department === "Executive") {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Total customers
      const totalCustomers = await prisma.customer.count({ where: { orgId } });

      // Pipeline stages
      const allCustomers = await prisma.customer.findMany({
        where: { orgId },
        select: { stage: true, lifetimeValue: true },
      });

      const pipelineStages: Record<string, { count: number; total_lifetime_value: number }> = {};
      for (const c of allCustomers) {
        const stage = c.stage || "lead";
        if (!pipelineStages[stage]) {
          pipelineStages[stage] = { count: 0, total_lifetime_value: 0 };
        }
        pipelineStages[stage].count += 1;
        pipelineStages[stage].total_lifetime_value += Number(c.lifetimeValue ?? 0);
      }

      // Recent customers
      const recentCustomers = await prisma.customer.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      // New leads this month
      const newLeads = await prisma.customer.findMany({
        where: { orgId, stage: "lead", createdAt: { gte: firstOfMonth } },
        select: { id: true, name: true, email: true, company: true, createdAt: true },
      });

      // Top customers by lifetime value
      const topCustomers = await prisma.customer.findMany({
        where: { orgId },
        select: { id: true, name: true, company: true, lifetimeValue: true, stage: true },
        orderBy: { lifetimeValue: "desc" },
        take: 5,
      });

      data.sales = {
        total_customers: totalCustomers,
        pipeline_stages: pipelineStages,
        recent_customers: recentCustomers,
        new_leads_this_month: newLeads,
        top_customers: topCustomers,
      };
    }

    // ----------------------------------------------------------------
    // Operations data
    // ----------------------------------------------------------------
    if (department === "Operations" || department === "Executive") {
      // Products with low stock flag
      const products = await prisma.product.findMany({ where: { orgId } });

      const productsWithFlag = products.map((p) => ({
        ...p,
        low_stock: p.reorderAt > 0 && p.quantity <= p.reorderAt,
      }));

      const totalProducts = productsWithFlag.length;
      const totalStockValue = productsWithFlag.reduce(
        (sum, p) => sum + (p.quantity ?? 0) * Number(p.costPrice ?? p.price ?? 0),
        0
      );

      // Low stock alerts
      const lowStockAlerts = productsWithFlag.filter(
        (p) => p.reorderAt > 0 && p.quantity <= p.reorderAt
      );

      // Active projects
      const activeProjects = await prisma.project.findMany({
        where: { orgId, status: "active" },
      });

      // All projects with task counts
      const allProjects = await prisma.project.findMany({
        where: { orgId },
        include: { tasks: { select: { id: true, status: true } } },
      });

      const projectsWithCounts = allProjects.map((p) => {
        const tasks = p.tasks || [];
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          priority: p.priority,
          startDate: p.startDate,
          dueDate: p.dueDate,
          total_tasks: tasks.length,
          completed_tasks: tasks.filter((t) => t.status === "done").length,
        };
      });

      // Recent tasks
      const recentTasks = await prisma.projectTask.findMany({
        where: { orgId },
        include: { project: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      data.operations = {
        products: productsWithFlag,
        total_products: totalProducts,
        total_stock_value: totalStockValue,
        low_stock_alerts: lowStockAlerts,
        active_projects: activeProjects,
        all_projects: projectsWithCounts,
        recent_tasks: recentTasks,
      };
    }

    // ----------------------------------------------------------------
    // Executive extras (gets everything above + these)
    // ----------------------------------------------------------------
    if (department === "Executive") {
      const workerCount = await prisma.aiWorker.count({ where: { orgId } });
      const activeWorkers = await prisma.aiWorker.count({ where: { orgId, status: "active" } });

      const pendingApprovals = await prisma.approvalRequest.findMany({
        where: { orgId, status: "pending" },
      });

      data.executive = {
        worker_count: workerCount,
        active_workers: activeWorkers,
        pending_approvals: pendingApprovals,
      };
    }

    // ----------------------------------------------------------------
    // Human Resources / fallback (documents, projects, activity)
    // ----------------------------------------------------------------
    if (
      department !== "Finance" &&
      department !== "Sales" &&
      department !== "Operations" &&
      department !== "Executive"
    ) {
      const documents = await prisma.document.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      const activeProjects = await prisma.project.findMany({
        where: { orgId, status: "active" },
      });

      const recentActivity = await prisma.activityLog.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      data.general = {
        documents,
        active_projects: activeProjects,
        recent_activity: recentActivity,
      };
    }

    return NextResponse.json({
      worker: {
        id: worker.id,
        name: worker.name,
        role: worker.role,
        department,
      },
      data,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Worker data endpoint error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
