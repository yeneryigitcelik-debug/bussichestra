import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const status = searchParams.get("status");
    const assignedWorkerId = searchParams.get("assigned_worker_id");

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing required query param: project_id" },
        { status: 400 }
      );
    }

    const where: Prisma.ProjectTaskWhereInput = { orgId, projectId };
    if (status) where.status = status;
    if (assignedWorkerId) where.assignedWorkerId = assignedWorkerId;

    const tasks = await prisma.projectTask.findMany({
      where,
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ tasks });
  } catch (err) {
    console.error("List tasks error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const body = await request.json();

    if (!body.project_id || !body.title) {
      return NextResponse.json(
        { error: "Missing required fields: project_id, title" },
        { status: 400 }
      );
    }

    const task = await prisma.projectTask.create({
      data: {
        orgId,
        projectId: body.project_id,
        title: body.title,
        description: body.description ?? null,
        status: body.status ?? "todo",
        priority: body.priority ?? "medium",
        assignedWorkerId: body.assigned_worker_id ?? null,
        assignedUserId: body.assigned_user_id ?? null,
        dueDate: body.due_date ? new Date(body.due_date) : null,
        estimatedHours: body.estimated_hours ?? null,
        sortOrder: body.sort_order ?? 0,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    console.error("Create task error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing required query param: id" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    delete body.id;
    delete body.org_id;
    delete body.orgId;
    delete body.project_id;
    delete body.projectId;
    delete body.created_at;
    delete body.createdAt;

    // Map snake_case keys from frontend to camelCase for Prisma
    const prismaData: Record<string, unknown> = {};
    const keyMap: Record<string, string> = {
      assigned_worker_id: "assignedWorkerId",
      assigned_user_id: "assignedUserId",
      due_date: "dueDate",
      estimated_hours: "estimatedHours",
      actual_hours: "actualHours",
      sort_order: "sortOrder",
      completed_at: "completedAt",
      parent_task_id: "parentTaskId",
    };

    for (const [key, value] of Object.entries(body)) {
      const prismaKey = keyMap[key] || key;
      prismaData[prismaKey] = value;
    }

    const result = await prisma.projectTask.updateMany({
      where: { id, orgId },
      data: prismaData,
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = await prisma.projectTask.findUnique({ where: { id } });

    return NextResponse.json({ task });
  } catch (err) {
    console.error("Update task error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
