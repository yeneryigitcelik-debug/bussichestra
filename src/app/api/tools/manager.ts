import { prisma } from "@/lib/prisma";
import { queryWorker } from "@/lib/ai/orchestrator";
import type { AIWorker } from "@/types/database";

export async function handleManagerTool(
  toolName: string,
  input: Record<string, unknown>,
  orgId: string,
): Promise<string> {
  switch (toolName) {
    case "delegate_to_worker":
      return await delegateToWorker(input, orgId);
    case "query_worker":
      return await queryWorkerTool(input, orgId);
    case "summarize_department":
      return await summarizeDepartment(input, orgId);
    case "list_all_workers":
      return await listAllWorkers(orgId);
    default:
      return JSON.stringify({ error: `Unknown manager tool: ${toolName}` });
  }
}

async function delegateToWorker(
  input: Record<string, unknown>,
  orgId: string,
): Promise<string> {
  const workerName = String(input.worker_name || "");
  const taskDescription = String(input.task || input.instructions || "");
  const priority = String(input.priority || "medium");

  if (!workerName || !taskDescription) {
    return JSON.stringify({ error: "worker_name and task are required" });
  }

  // Find the worker
  const worker = await prisma.aiWorker.findFirst({
    where: {
      orgId,
      name: { contains: workerName, mode: "insensitive" },
    },
    select: { id: true, name: true, role: true },
  });

  if (!worker) {
    return JSON.stringify({ error: `Worker "${workerName}" not found` });
  }

  // Create a worker task
  const task = await prisma.workerTask.create({
    data: {
      workerId: worker.id,
      orgId,
      type: "delegation",
      status: "pending",
      priority,
      input: { description: taskDescription },
      assignedBy: "worker",
    },
    select: { id: true },
  });

  // Create an inter-worker message
  const managerWorker = await prisma.aiWorker.findFirst({
    where: { orgId, isManager: true },
    select: { id: true },
  });

  if (managerWorker) {
    await prisma.workerMessage.create({
      data: {
        orgId,
        fromWorkerId: managerWorker.id,
        toWorkerId: worker.id,
        subject: `Task Delegation: ${taskDescription.slice(0, 100)}`,
        content: taskDescription,
        context: { priority, task_id: task.id },
        status: "pending",
      },
    });
  }

  return JSON.stringify({
    success: true,
    message: `Task delegated to ${worker.name} (${worker.role})`,
    task_id: task.id,
    worker: { id: worker.id, name: worker.name, role: worker.role },
    priority,
  });
}

async function queryWorkerTool(
  input: Record<string, unknown>,
  orgId: string,
): Promise<string> {
  const workerName = String(input.worker_name || "");
  const question = String(input.question || "");

  if (!workerName || !question) {
    return JSON.stringify({ error: "worker_name and question are required" });
  }

  // Find the worker
  const worker = await prisma.aiWorker.findFirst({
    where: {
      orgId,
      name: { contains: workerName, mode: "insensitive" },
    },
  });

  if (!worker) {
    return JSON.stringify({ error: `Worker "${workerName}" not found` });
  }

  // Get org name
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  try {
    const response = await queryWorker(
      worker as unknown as AIWorker,
      question,
      org?.name || "Company"
    );

    // Save as inter-worker message
    const managerWorker = await prisma.aiWorker.findFirst({
      where: { orgId, isManager: true },
      select: { id: true },
    });

    if (managerWorker) {
      await prisma.workerMessage.create({
        data: {
          orgId,
          fromWorkerId: managerWorker.id,
          toWorkerId: worker.id,
          subject: `Query: ${question.slice(0, 100)}`,
          content: question,
          context: { response },
          status: "responded",
        },
      });
    }

    return JSON.stringify({
      worker: worker.name,
      role: worker.role,
      department: (worker.settings as Record<string, string>)?.department_name || "General",
      response,
    });
  } catch (err) {
    return JSON.stringify({
      error: `Failed to query ${worker.name}: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
  }
}

async function summarizeDepartment(
  input: Record<string, unknown>,
  orgId: string,
): Promise<string> {
  const department = String(input.department || "");

  if (!department) {
    return JSON.stringify({ error: "department is required" });
  }

  // Get workers in department — filter by settings JSON containing department_name
  const allWorkers = await prisma.aiWorker.findMany({
    where: { orgId },
    select: { id: true, name: true, role: true, status: true, settings: true },
  });

  const workers = allWorkers.filter((w) => {
    const settings = w.settings as Record<string, string> | null;
    return settings?.department_name === department;
  });

  // Get recent activity for department workers
  const workerIds = workers.map((w) => w.id);

  const recentActivity = workerIds.length > 0
    ? await prisma.activityLog.findMany({
        where: { orgId, actorId: { in: workerIds } },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  // Get department-specific metrics based on department name
  const metrics: Record<string, unknown> = {};

  if (department.toLowerCase().includes("finance")) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const recentTxns = await prisma.transaction.findMany({
      where: {
        orgId,
        date: { gte: thirtyDaysAgo },
      },
      select: { type: true, amount: true },
    });

    const revenue = recentTxns.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = recentTxns.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
    metrics.monthly_revenue = revenue;
    metrics.monthly_expenses = expenses;
    metrics.net_profit = revenue - expenses;
  }

  if (department.toLowerCase().includes("sales")) {
    const customers = await prisma.customer.findMany({
      where: { orgId },
      select: { stage: true },
    });

    const stages = customers.reduce((acc, c) => {
      acc[c.stage] = (acc[c.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    metrics.pipeline = stages;
    metrics.total_customers = customers.length;
  }

  if (department.toLowerCase().includes("operations") || department.toLowerCase().includes("production")) {
    const allProducts = await prisma.product.findMany({
      where: { orgId },
      select: { quantity: true, reorderAt: true },
    });
    const lowStockCount = allProducts.filter((p) => p.quantity <= p.reorderAt).length;
    metrics.low_stock_alerts = lowStockCount;

    const activeProjects = await prisma.project.count({
      where: { orgId, status: "active" },
    });
    metrics.active_projects = activeProjects;
  }

  return JSON.stringify({
    department,
    workers: workers.map((w) => ({
      name: w.name,
      role: w.role,
      status: w.status,
    })),
    worker_count: workers.length,
    metrics,
    recent_activity: recentActivity.slice(0, 5).map((a) => ({
      action: a.action,
      entity: a.entityName,
      time: a.createdAt,
    })),
  });
}

async function listAllWorkers(
  orgId: string,
): Promise<string> {
  const workers = await prisma.aiWorker.findMany({
    where: { orgId },
    select: { id: true, name: true, role: true, status: true, isManager: true, settings: true },
    orderBy: { isManager: "desc" },
  });

  return JSON.stringify({
    workers: workers.map((w) => ({
      id: w.id,
      name: w.name,
      role: w.role,
      department: (w.settings as Record<string, string>)?.department_name || "General",
      status: w.status,
      is_manager: w.isManager,
    })),
    total: workers.length,
    active: workers.filter((w) => w.status === "active").length,
    idle: workers.filter((w) => w.status === "idle").length,
  });
}
