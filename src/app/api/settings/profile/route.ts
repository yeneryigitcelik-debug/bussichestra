import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { error, prisma, userId, orgId } = await getAuthenticatedContext();
  if (error) return error;

  try {
    const profile = await prisma.user.findFirst({
      where: { id: userId, orgId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        orgId: true,
        createdAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (err) {
    console.error("GET /api/settings/profile error:", err);
    return NextResponse.json(
      { error: "Unexpected error", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const { error, prisma, userId, orgId } = await getAuthenticatedContext();
  if (error) return error;

  try {
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    // Handle full_name / name update
    const nameValue = body.full_name ?? body.name;
    if (nameValue !== undefined) {
      if (typeof nameValue !== "string" || nameValue.trim().length === 0) {
        return NextResponse.json({ error: "Full name must be a non-empty string" }, { status: 400 });
      }
      updateData.name = nameValue.trim();
    }

    // Handle email change — with NextAuth, email changes require re-verification
    // For now, update the email in the database directly
    if (body.email !== undefined) {
      if (typeof body.email !== "string" || !body.email.includes("@")) {
        return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
      }
      updateData.email = body.email.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update. Allowed fields: full_name, email" }, { status: 400 });
    }

    const updatedProfile = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        orgId: true,
        createdAt: true,
      },
    });

    const response: Record<string, unknown> = { ...updatedProfile };
    if (body.email !== undefined) {
      response.email_update = {
        success: true,
        message: "Email has been updated. You may need to sign in again.",
      };
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("PATCH /api/settings/profile error:", err);
    return NextResponse.json(
      { error: "Unexpected error", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
