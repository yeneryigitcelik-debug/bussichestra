import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { error, prisma, orgId } = await getAuthenticatedContext();
  if (error) return error;

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json(org);
  } catch (err) {
    console.error("GET /api/settings/organization error:", err);
    return NextResponse.json(
      { error: "Unexpected error", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const { error, prisma, orgId } = await getAuthenticatedContext();
  if (error) return error;

  try {
    const body = await request.json();

    // Only allow updating name and settings
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return NextResponse.json({ error: "Organization name must be a non-empty string" }, { status: 400 });
      }
      updateData.name = body.name.trim();
    }

    if (body.settings !== undefined) {
      if (typeof body.settings !== "object" || body.settings === null || Array.isArray(body.settings)) {
        return NextResponse.json({ error: "Settings must be a JSON object" }, { status: 400 });
      }

      // Merge with existing settings rather than overwriting
      const currentOrg = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { settings: true },
      });

      const currentSettings = (currentOrg?.settings as Record<string, unknown>) ?? {};
      updateData.settings = { ...currentSettings, ...body.settings };
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update. Allowed fields: name, settings" }, { status: 400 });
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/settings/organization error:", err);
    return NextResponse.json(
      { error: "Unexpected error", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
