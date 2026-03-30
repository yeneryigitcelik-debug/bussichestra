import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

interface LogActivityParams {
  orgId: string;
  actorType: "user" | "worker" | "system";
  actorId: string;
  actorName: string;
  action: "created" | "updated" | "deleted" | "sent" | "completed" | "failed" | "approved" | "rejected";
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown>;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        orgId: params.orgId,
        actorType: params.actorType,
        actorId: params.actorId,
        actorName: params.actorName,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || undefined,
        entityName: params.entityName || undefined,
        details: (params.details || {}) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("Activity logging failed:", err);
  }
}

export async function createNotification(params: {
  orgId: string;
  userId?: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
  sourceWorkerId?: string;
}): Promise<void> {
  try {
    if (params.userId) {
      await prisma.notification.create({
        data: {
          orgId: params.orgId,
          userId: params.userId,
          type: params.type,
          title: params.title,
          body: params.body,
          actionUrl: params.actionUrl || null,
          sourceWorkerId: params.sourceWorkerId || null,
        },
      });
    } else {
      const users = await prisma.user.findMany({
        where: { orgId: params.orgId },
        select: { id: true },
      });

      if (users.length > 0) {
        await prisma.notification.createMany({
          data: users.map((u) => ({
            orgId: params.orgId,
            userId: u.id,
            type: params.type,
            title: params.title,
            body: params.body,
            actionUrl: params.actionUrl || null,
            sourceWorkerId: params.sourceWorkerId || null,
          })),
        });
      }
    }
  } catch (err) {
    console.error("Notification creation failed:", err);
  }
}
