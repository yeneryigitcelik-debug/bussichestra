import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { error, prisma, orgId, userId } = await getAuthenticatedContext();
    if (error) return error;

    const notifications = await prisma.notification.findMany({
      where: { orgId, userId },
      orderBy: [
        { isRead: "asc" },
        { createdAt: "desc" },
      ],
      take: 50,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({ notifications, unread_count: unreadCount });
  } catch (err) {
    console.error("List notifications error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { error, prisma, orgId, userId } = await getAuthenticatedContext();
    if (error) return error;

    const body = await request.json();
    const now = new Date();

    if (body.markAllRead) {
      // Mark all notifications as read for this user
      await prisma.notification.updateMany({
        where: { orgId, userId, isRead: false },
        data: { isRead: true, readAt: now },
      });

      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (body.id) {
      // Mark single notification as read
      const result = await prisma.notification.updateMany({
        where: { id: body.id, orgId, userId },
        data: { isRead: true, readAt: now },
      });

      if (result.count === 0) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }

      const notification = await prisma.notification.findUnique({ where: { id: body.id } });

      return NextResponse.json({ notification });
    }

    return NextResponse.json(
      { error: "Provide either 'id' or 'markAllRead: true'" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Update notification error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
