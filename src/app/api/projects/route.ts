import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const where: Prisma.ProjectWhereInput = { orgId };
    if (status) where.status = status;

    const [projects, count] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          tasks: { select: { id: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    // Compute task counts for each project
    const projectsWithCounts = projects.map((project) => {
      const tasks = project.tasks ?? [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(
        (t) => t.status === "completed" || t.status === "done"
      ).length;

      // Remove raw tasks from response, keep counts
      const { tasks: _, ...projectData } = project;
      return {
        ...projectData,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
      };
    });

    return NextResponse.json({ projects: projectsWithCounts, total: count });
  } catch (err) {
    console.error("List projects error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        orgId,
        name: body.name,
        description: body.description ?? null,
        status: body.status ?? "planning",
        priority: body.priority ?? "medium",
        ownerWorkerId: body.owner_worker_id ?? null,
        customerId: body.customer_id ?? null,
        budget: body.budget ?? null,
        startDate: body.start_date ? new Date(body.start_date) : null,
        dueDate: body.due_date ? new Date(body.due_date) : null,
        tags: body.tags ?? [],
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    console.error("Create project error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
