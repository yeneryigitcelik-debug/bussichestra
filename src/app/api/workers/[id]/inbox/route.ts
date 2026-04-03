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

    // Load the worker to get their department
    const worker = await prisma.aiWorker.findFirst({
      where: { id: workerId, orgId },
      select: { id: true, name: true, role: true, settings: true },
    });

    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    const department = (worker.settings as Record<string, string>)?.department_name || "General";

    // ----------------------------------------------------------------
    // 1. Pending / running tasks assigned to this worker
    // ----------------------------------------------------------------
    const tasks = await prisma.workerTask.findMany({
      where: {
        workerId,
        orgId,
        status: { in: ["pending", "running"] },
      },
      orderBy: [
        { createdAt: "asc" },
      ],
    });

    // Re-sort tasks by priority weight then created_at
    const priorityWeight: Record<string, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    const sortedTasks = tasks.sort((a, b) => {
      const pa = priorityWeight[a.priority] ?? 4;
      const pb = priorityWeight[b.priority] ?? 4;
      if (pa !== pb) return pa - pb;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // ----------------------------------------------------------------
    // 2. Pending inter-worker messages addressed to this worker
    // ----------------------------------------------------------------
    const messages = await prisma.workerMessage.findMany({
      where: {
        toWorkerId: workerId,
        orgId,
        status: "pending",
      },
      orderBy: { createdAt: "desc" },
    });

    // ----------------------------------------------------------------
    // 3. Unread notifications linked to this worker
    // ----------------------------------------------------------------
    const notifications = await prisma.notification.findMany({
      where: {
        orgId,
        sourceWorkerId: workerId,
        isRead: false,
      },
      orderBy: { createdAt: "desc" },
    });

    // ----------------------------------------------------------------
    // 4. Department-specific alerts
    // ----------------------------------------------------------------
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alerts: any[] = [];

    if (department === "Finance" || department === "Executive") {
      // Overdue invoices
      const overdueInvoices = await prisma.invoice.findMany({
        where: { orgId, status: "overdue" },
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          dueDate: true,
          customer: { select: { name: true } },
        },
      });

      for (const inv of overdueInvoices) {
        alerts.push({
          type: "overdue_invoice",
          severity: "high",
          title: `Overdue invoice ${inv.invoiceNumber}`,
          details: {
            invoice_id: inv.id,
            invoice_number: inv.invoiceNumber,
            total: inv.total,
            due_date: inv.dueDate,
            customer: inv.customer?.name ?? null,
          },
        });
      }
    }

    if (department === "Operations" || department === "Executive") {
      // Low stock alerts
      const lowStockProducts = await prisma.product.findMany({
        where: { orgId, reorderAt: { gt: 0 } },
        select: { id: true, name: true, sku: true, quantity: true, reorderAt: true },
      });

      for (const p of lowStockProducts) {
        if (p.quantity <= p.reorderAt) {
          alerts.push({
            type: "low_stock",
            severity: p.quantity === 0 ? "critical" : "medium",
            title: `Low stock: ${p.name}`,
            details: {
              product_id: p.id,
              name: p.name,
              sku: p.sku,
              current_quantity: p.quantity,
              reorder_at: p.reorderAt,
            },
          });
        }
      }
    }

    if (department === "Sales" || department === "Executive") {
      // Leads with no recent contact (>7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const staleLeads = await prisma.customer.findMany({
        where: {
          orgId,
          stage: { in: ["lead", "prospect"] },
          lastContactAt: { lt: sevenDaysAgo },
        },
        select: { id: true, name: true, email: true, company: true, stage: true, lastContactAt: true },
      });

      for (const lead of staleLeads) {
        alerts.push({
          type: "stale_lead",
          severity: "medium",
          title: `No contact in 7+ days: ${lead.name}`,
          details: {
            customer_id: lead.id,
            name: lead.name,
            email: lead.email,
            company: lead.company,
            stage: lead.stage,
            last_contact_at: lead.lastContactAt,
          },
        });
      }
    }

    const totalPending =
      sortedTasks.length +
      messages.length +
      notifications.length +
      alerts.length;

    return NextResponse.json({
      tasks: sortedTasks,
      messages,
      notifications,
      alerts,
      total_pending: totalPending,
    });
  } catch (err) {
    console.error("Worker inbox endpoint error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
