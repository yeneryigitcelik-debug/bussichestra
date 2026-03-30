import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function getAuthenticatedContext() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      prisma: null as unknown as typeof prisma,
      userId: null as unknown as string,
      orgId: null as unknown as string,
      session: null,
    };
  }

  const orgId = session.user.orgId;

  if (!orgId) {
    return {
      error: NextResponse.json({ error: "No organization found" }, { status: 403 }),
      prisma: null as unknown as typeof prisma,
      userId: null as unknown as string,
      orgId: null as unknown as string,
      session: null,
    };
  }

  return {
    error: null,
    prisma,
    userId: session.user.id,
    orgId,
    session,
  };
}
