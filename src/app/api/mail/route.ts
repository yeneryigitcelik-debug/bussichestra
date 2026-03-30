import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get("worker_id");
    const direction = searchParams.get("direction");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const where: Prisma.EmailMessageWhereInput = { orgId };

    if (workerId) where.workerId = workerId;
    if (direction) where.direction = direction;
    if (status) where.status = status;
    if (search) where.subject = { contains: search, mode: "insensitive" };

    const [emails, count] = await Promise.all([
      prisma.emailMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.emailMessage.count({ where }),
    ]);

    return NextResponse.json({ emails, total: count });
  } catch (err) {
    console.error("List emails error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
