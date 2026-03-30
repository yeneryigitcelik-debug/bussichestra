import { prisma } from "@/lib/prisma";

export async function handleProjectTool(
  toolName: string,
  input: Record<string, unknown>,
  orgId: string,
): Promise<string> {
  switch (toolName) {
    case "list_projects": {
      const { status } = input as { status?: string };

      const where: Record<string, unknown> = { orgId };
      if (status) where.status = status;

      const data = await prisma.project.findMany({
        where,
        select: {
          id: true, name: true, description: true, status: true, priority: true,
          budget: true, startDate: true, dueDate: true, tags: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const projects = data.map((p) => ({
        id: p.id, name: p.name, description: p.description, status: p.status,
        priority: p.priority, budget: p.budget ? Number(p.budget) : null,
        start_date: p.startDate, due_date: p.dueDate, tags: p.tags, created_at: p.createdAt,
      }));

      return JSON.stringify({ projects, count: projects.length });
    }

    case "create_project": {
      const { name, description, priority, customer_id, budget, start_date, due_date } = input as {
        name: string; description?: string; priority?: string; customer_id?: string;
        budget?: number; start_date?: string; due_date?: string;
      };

      const data = await prisma.project.create({
        data: {
          orgId,
          name,
          description: description || null,
          priority: priority || "medium",
          customerId: customer_id || null,
          budget: budget || null,
          startDate: start_date ? new Date(start_date) : null,
          dueDate: due_date ? new Date(due_date) : null,
        },
      });

      return JSON.stringify({ project_id: data.id, name, status: "planning" });
    }

    case "create_task": {
      const { project_id, title, description, priority, assigned_worker_id, due_date, estimated_hours } = input as {
        project_id: string; title: string; description?: string; priority?: string;
        assigned_worker_id?: string; due_date?: string; estimated_hours?: number;
      };

      const data = await prisma.projectTask.create({
        data: {
          projectId: project_id,
          orgId,
          title,
          description: description || null,
          priority: priority || "medium",
          assignedWorkerId: assigned_worker_id || null,
          dueDate: due_date ? new Date(due_date) : null,
          estimatedHours: estimated_hours || null,
        },
      });

      return JSON.stringify({ task_id: data.id, title, status: "todo" });
    }

    case "update_task_status": {
      const { task_id, status } = input as { task_id: string; status: string };

      const updates: Record<string, unknown> = { status };
      if (status === "done") updates.completedAt = new Date();

      await prisma.projectTask.update({ where: { id: task_id }, data: updates });
      return JSON.stringify({ task_id, new_status: status });
    }

    default:
      return JSON.stringify({ error: `Unknown project tool: ${toolName}` });
  }
}
