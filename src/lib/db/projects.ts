import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Projects & Tasks
// ---------------------------------------------------------------------------

export async function getProjects(
  orgId: string,
  filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  },
) {
  const where: Prisma.ProjectWhereInput = {
    orgId,
    ...(filters?.status ? { status: filters.status } : {}),
  };

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        ownerWorker: { select: { id: true, name: true, role: true } },
        customer: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
    }),
    prisma.project.count({ where }),
  ]);

  return {
    projects: projects.map((p) => ({
      ...p,
      budget: p.budget ? Number(p.budget) : null,
      taskCount: p._count.tasks,
    })),
    total,
  };
}

export async function getProject(orgId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId },
    include: {
      ownerWorker: { select: { id: true, name: true, role: true } },
      customer: { select: { id: true, name: true } },
      tasks: {
        include: {
          assignedWorker: { select: { id: true, name: true } },
          assignedUser: { select: { id: true, name: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!project) return null;

  return {
    ...project,
    budget: project.budget ? Number(project.budget) : null,
    tasks: project.tasks.map((t) => ({
      ...t,
      estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : null,
      actualHours: t.actualHours ? Number(t.actualHours) : null,
    })),
  };
}

export async function createProject(
  orgId: string,
  data: {
    name: string;
    description?: string;
    status?: string;
    priority?: string;
    ownerWorkerId?: string;
    customerId?: string;
    budget?: number;
    startDate?: Date;
    dueDate?: Date;
    tags?: string[];
    settings?: Prisma.InputJsonValue;
  },
) {
  return prisma.project.create({
    data: {
      orgId,
      name: data.name,
      description: data.description,
      status: data.status ?? "active",
      priority: data.priority ?? "medium",
      ownerWorkerId: data.ownerWorkerId,
      customerId: data.customerId,
      budget: data.budget !== undefined ? new Prisma.Decimal(data.budget) : undefined,
      startDate: data.startDate,
      dueDate: data.dueDate,
      tags: data.tags ?? [],
      settings: data.settings ?? {},
    },
    include: {
      ownerWorker: { select: { id: true, name: true, role: true } },
      _count: { select: { tasks: true } },
    },
  });
}

// ── Tasks ───────────────────────────────────────────────────────────────────

export async function getProjectTasks(
  orgId: string,
  projectId: string,
  filters?: {
    status?: string;
    assignedWorkerId?: string;
  },
) {
  const where: Prisma.ProjectTaskWhereInput = {
    orgId,
    projectId,
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.assignedWorkerId
      ? { assignedWorkerId: filters.assignedWorkerId }
      : {}),
  };

  const tasks = await prisma.projectTask.findMany({
    where,
    include: {
      assignedWorker: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, name: true } },
      subTasks: {
        select: { id: true, title: true, status: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return tasks.map((t) => ({
    ...t,
    estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : null,
    actualHours: t.actualHours ? Number(t.actualHours) : null,
  }));
}

export async function createTask(
  orgId: string,
  data: {
    projectId: string;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assignedWorkerId?: string;
    assignedUserId?: string;
    parentTaskId?: string;
    dueDate?: Date;
    estimatedHours?: number;
    sortOrder?: number;
  },
) {
  return prisma.projectTask.create({
    data: {
      orgId,
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      status: data.status ?? "todo",
      priority: data.priority ?? "medium",
      assignedWorkerId: data.assignedWorkerId,
      assignedUserId: data.assignedUserId,
      parentTaskId: data.parentTaskId,
      dueDate: data.dueDate,
      estimatedHours: data.estimatedHours !== undefined
        ? new Prisma.Decimal(data.estimatedHours)
        : undefined,
      sortOrder: data.sortOrder ?? 0,
    },
    include: {
      assignedWorker: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, name: true } },
    },
  });
}

export async function updateTask(
  orgId: string,
  taskId: string,
  data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assignedWorkerId?: string;
    assignedUserId?: string;
    parentTaskId?: string;
    dueDate?: Date;
    estimatedHours?: number;
    actualHours?: number;
    sortOrder?: number;
    completedAt?: Date;
  },
) {
  const updateData: Record<string, unknown> = { ...data };

  if (data.estimatedHours !== undefined) {
    updateData.estimatedHours = new Prisma.Decimal(data.estimatedHours);
  }
  if (data.actualHours !== undefined) {
    updateData.actualHours = new Prisma.Decimal(data.actualHours);
  }
  // Auto-set completedAt when status changes to "done"
  if (data.status === "done" && !data.completedAt) {
    updateData.completedAt = new Date();
  }

  await prisma.projectTask.updateMany({
    where: { id: taskId, orgId },
    data: updateData as Prisma.ProjectTaskUpdateManyMutationInput,
  });

  return prisma.projectTask.findFirst({
    where: { id: taskId, orgId },
    include: {
      assignedWorker: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, name: true } },
    },
  });
}
