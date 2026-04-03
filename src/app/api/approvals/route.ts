import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error, prisma, orgId } = await getAuthenticatedContext();
  if (error) return error;

  try {
    const approvals = await prisma.approvalRequest.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      approvals,
      pending_count: approvals.filter((a) => a.status === "pending").length,
    });
  } catch (err) {
    console.error("Approvals GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { error, prisma, orgId, userId } = await getAuthenticatedContext();
  if (error) return error;

  try {
    const body = await request.json();
    const { id, status, decision_note } = body;

    if (!id || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "id and status (approved/rejected) required" }, { status: 400 });
    }

    const result = await prisma.approvalRequest.updateMany({
      where: { id, orgId },
      data: {
        status,
        approvedBy: userId,
        decisionNote: decision_note || null,
        decidedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
    }

    const approval = await prisma.approvalRequest.findUnique({ where: { id } });

    return NextResponse.json(approval);
  } catch (err) {
    console.error("Approvals PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
