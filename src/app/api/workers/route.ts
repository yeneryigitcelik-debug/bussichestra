import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api-utils";
import { DEFAULT_WORKERS } from "@/lib/ai/prompts";
import { AI_MODELS } from "@/lib/constants";

// GET /api/workers — list all workers
export async function GET() {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();

    if (!error && prisma && orgId) {
      const workers = await prisma.aiWorker.findMany({
        where: { orgId },
        include: { department: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      });

      return NextResponse.json({ workers });
    }

    // Demo mode fallback
    const workers = Object.entries(DEFAULT_WORKERS).map(([key, config]) => ({
      id: key,
      name: config.name,
      role: config.role,
      persona: config.persona,
      department_name: config.department,
      status: "active",
      tools: config.tools,
      is_manager: "is_manager" in config ? Boolean(config.is_manager) : false,
      model: "is_manager" in config && config.is_manager ? AI_MODELS.MANAGER : AI_MODELS.WORKER,
      temperature: 0.7,
      max_tokens: 4096,
      language: "en",
      email: `${key}@orchestraos.com`,
      settings: { department_name: config.department },
      created_at: new Date().toISOString(),
    }));

    return NextResponse.json({ workers });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}

// POST /api/workers — create a new worker
export async function POST(request: NextRequest) {
  try {
    const { error, prisma, orgId, session } = await getAuthenticatedContext();
    if (error) return error;

    const body = await request.json();
    const { name, role, department_id, persona, tools, model, temperature, max_tokens, language, is_manager } = body;

    if (!name || !role || !persona) {
      return NextResponse.json({ error: "name, role, and persona are required" }, { status: 400 });
    }

    // Check if user is admin/owner
    const userRole = session?.user?.role;
    if (!userRole || !["owner", "admin"].includes(userRole)) {
      return NextResponse.json({ error: "Only admins can create workers" }, { status: 403 });
    }

    const worker = await prisma.aiWorker.create({
      data: {
        orgId,
        name,
        role,
        departmentId: department_id || null,
        persona,
        tools: tools || [],
        model: model || AI_MODELS.WORKER,
        temperature: temperature ?? 0.7,
        maxTokens: max_tokens || 4096,
        language: language || "en",
        isManager: is_manager || false,
        status: "active",
        settings: {},
      },
    });

    return NextResponse.json({ worker }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}

// PATCH /api/workers — update a worker
export async function PATCH(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "Worker id is required" }, { status: 400 });

    // Map snake_case keys from frontend to camelCase for Prisma
    const prismaData: Record<string, unknown> = {};
    const keyMap: Record<string, string> = {
      department_id: "departmentId",
      is_manager: "isManager",
      max_tokens: "maxTokens",
      avatar_url: "avatarUrl",
    };

    for (const [key, value] of Object.entries(updates)) {
      if (key === "org_id" || key === "orgId" || key === "created_at" || key === "createdAt") continue;
      const prismaKey = keyMap[key] || key;
      prismaData[prismaKey] = value;
    }

    const result = await prisma.aiWorker.updateMany({
      where: { id, orgId },
      data: prismaData,
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    const worker = await prisma.aiWorker.findUnique({ where: { id } });

    return NextResponse.json({ worker });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}

// DELETE /api/workers — delete a worker
export async function DELETE(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Worker id is required" }, { status: 400 });

    const result = await prisma.aiWorker.deleteMany({
      where: { id, orgId },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
