import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Activity Logs — audit trail for all worker & user actions
// ---------------------------------------------------------------------------

export async function getActivityLogs(orgId: string, limit: number = 50) {
  return prisma.activityLog.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function logActivity(
  orgId: string,
  data: {
    actorType: string;
    actorId: string;
    actorName?: string;
    action: string;
    entityType: string;
    entityId?: string;
    entityName?: string;
    details?: Prisma.InputJsonValue;
  },
): void {
  // Fire-and-forget: we intentionally do not await and silently catch errors
  prisma.activityLog
    .create({
      data: {
        orgId,
        actorType: data.actorType,
        actorId: data.actorId,
        actorName: data.actorName,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        entityName: data.entityName,
        details: data.details ?? {},
      },
    })
    .catch(() => {
      // Silently swallow — activity logging must never break the caller
    });
}
