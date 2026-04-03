import type { Prisma } from "@prisma/client";
// ============================================================
// POST /api/pipeline — Receive an event and route it to a worker
// ============================================================

import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api-utils";
import { classifyAndRoute, type PipelineEvent } from "@/lib/pipeline/router";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // ---- 1. Auth check ----
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    // ---- 2. Parse & validate body ----
    const body = await request.json() as PipelineEvent;

    if (!body.type || !body.subject || !body.content) {
      return NextResponse.json(
        { error: "Missing required fields: type, subject, content" },
        { status: 400 }
      );
    }

    const event: PipelineEvent = {
      type: body.type,
      subject: body.subject,
      content: body.content,
      metadata: body.metadata || {},
      from: body.from,
      urgency: body.urgency,
    };

    // ---- 3. Load all workers for the org ----
    const workers = await prisma.aiWorker.findMany({
      where: { orgId },
      select: { id: true, name: true, role: true, departmentId: true },
    });

    // Load department names for each worker
    const departments = await prisma.department.findMany({
      where: { orgId },
      select: { id: true, name: true },
    });

    const deptMap = new Map<string, string>();
    for (const dept of departments) {
      deptMap.set(dept.id, dept.name);
    }

    const workerList = workers.map((w) => ({
      id: w.id,
      name: w.name,
      role: w.role,
      department: deptMap.get(w.departmentId || "") || "Executive",
    }));

    // ---- 4. Classify & route ----
    const routingResult = classifyAndRoute(event, workerList);

    // ---- 5. Resolve target worker ----
    let targetWorker = routingResult.target_worker_id
      ? workerList.find((w) => w.id === routingResult.target_worker_id)
      : workerList.find((w) => w.department === routingResult.target_department);

    // Fallback to any available worker if department match fails
    if (!targetWorker && workerList.length > 0) {
      targetWorker = workerList.find((w) => w.department === "Executive") || workerList[0];
    }

    if (!targetWorker) {
      return NextResponse.json(
        { error: "No workers available to handle this event" },
        { status: 404 }
      );
    }

    // ---- 6. Create a worker_task ----
    const task = await prisma.workerTask.create({
      data: {
        workerId: targetWorker.id,
        orgId,
        type: event.type,
        status: "pending",
        priority: routingResult.urgency,
        input: { event } as unknown as Prisma.InputJsonValue,
        assignedBy: "system",
      },
      select: { id: true },
    });

    // ---- 7. Create a worker_message from "system" to the target worker ----
    await prisma.workerMessage.create({
      data: {
        orgId,
        fromWorkerId: targetWorker.id, // system message addressed to the worker
        toWorkerId: targetWorker.id,
        subject: event.subject,
        content: event.content,
        context: {
          routing: routingResult,
          original_event: event,
          source: "pipeline",
        } as unknown as Prisma.InputJsonValue,
        status: "pending",
      },
    });

    // ---- 8. Notify org users about the routing ----
    const orgUsers = await prisma.user.findMany({
      where: { orgId },
      select: { id: true },
    });

    if (orgUsers.length > 0) {
      await prisma.notification.createMany({
        data: orgUsers.map((u) => ({
          orgId,
          userId: u.id,
          type: "worker_message",
          title: `New ${event.type} routed to ${targetWorker!.name}`,
          body: `"${event.subject}" has been assigned to ${targetWorker!.name} (${targetWorker!.department}) with ${routingResult.urgency} urgency.`,
          sourceWorkerId: targetWorker!.id,
        })),
      });
    }

    // ---- 9. Log activity ----
    await prisma.activityLog.create({
      data: {
        orgId,
        actorType: "system",
        actorId: "pipeline",
        actorName: "Pipeline Router",
        action: "created",
        entityType: "worker_task",
        entityId: task.id,
        entityName: `${event.type}: ${event.subject}`,
        details: {
          routing: routingResult,
          event_type: event.type,
          target_worker: targetWorker.name,
          target_department: routingResult.target_department,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // ---- 10. Return result ----
    return NextResponse.json({
      routed: true,
      target_worker: {
        id: targetWorker.id,
        name: targetWorker.name,
        department: targetWorker.department,
      },
      task_id: task.id,
      urgency: routingResult.urgency,
      reason: routingResult.reason,
    });
  } catch (err) {
    console.error("Pipeline routing error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
