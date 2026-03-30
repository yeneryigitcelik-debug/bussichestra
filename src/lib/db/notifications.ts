import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Notifications — per-user alerts & updates
// ---------------------------------------------------------------------------

export async function getNotifications(
  userId: string,
  filters?: { limit?: number },
) {
  return prisma.notification.findMany({
    where: { userId },
    include: {
      sourceWorker: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: filters?.limit ?? 30,
  });
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllNotificationsRead(
  userId: string,
  orgId: string,
) {
  return prisma.notification.updateMany({
    where: { userId, orgId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function createNotification(
  orgId: string,
  data: {
    userId?: string;
    type: string;
    title: string;
    body?: string;
    actionUrl?: string;
    sourceWorkerId?: string;
  },
) {
  // If a specific userId is provided, create a single notification
  if (data.userId) {
    return prisma.notification.create({
      data: {
        orgId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        actionUrl: data.actionUrl,
        sourceWorkerId: data.sourceWorkerId,
      },
    });
  }

  // Otherwise, create a notification for every user in the organization
  const users = await prisma.user.findMany({
    where: { orgId },
    select: { id: true },
  });

  if (users.length === 0) return null;

  return prisma.notification.createMany({
    data: users.map((user) => ({
      orgId,
      userId: user.id,
      type: data.type,
      title: data.title,
      body: data.body,
      actionUrl: data.actionUrl,
      sourceWorkerId: data.sourceWorkerId,
    })),
  });
}
