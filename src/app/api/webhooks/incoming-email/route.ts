import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/webhooks/incoming-email
// Accepts: { api_key, org_slug, from, to, subject, body, attachments? }
// Routes the email to the right worker based on department/rules
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_key, org_slug, from, to, subject, body: emailBody, cc, attachments } = body;

    if (!org_slug || !from || !subject) {
      return NextResponse.json({ error: "org_slug, from, and subject are required" }, { status: 400 });
    }

    // Find org by slug
    const org = await prisma.organization.findUnique({ where: { slug: org_slug } });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Simple API key check from org settings
    const settings = org.settings as Record<string, unknown> | null;
    const storedKey = settings?.webhook_api_key;
    if (storedKey && storedKey !== api_key) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Save the email
    const email = await prisma.emailMessage.create({
      data: {
        orgId: org.id,
        direction: "inbound",
        status: "received",
        fromAddress: from,
        toAddresses: Array.isArray(to) ? to : [to],
        ccAddresses: cc ? (Array.isArray(cc) ? cc : [cc]) : [],
        subject: subject,
        bodyText: emailBody || "",
        attachments: attachments || [],
        receivedAt: new Date(),
      },
    });

    // Try to match email to existing customer
    const customer = await prisma.customer.findFirst({
      where: { orgId: org.id, email: from },
    });

    if (customer) {
      await prisma.emailMessage.update({
        where: { id: email.id },
        data: { linkedCustomerId: customer.id },
      });
    }

    // Auto-route: find a worker to handle this email
    // Priority: sales worker for new leads, assigned worker for existing customers
    let routedWorkerId: string | null = null;

    if (customer?.assignedWorkerId) {
      routedWorkerId = customer.assignedWorkerId;
    } else {
      // Route to first available sales worker
      const salesWorker = await prisma.aiWorker.findFirst({
        where: { orgId: org.id, status: "active", settings: { path: ["department_name"], string_contains: "Sales" } },
      });
      routedWorkerId = salesWorker?.id || null;
    }

    if (routedWorkerId) {
      await prisma.emailMessage.update({
        where: { id: email.id },
        data: { workerId: routedWorkerId },
      });
    }

    // Create notification for org users
    const users = await prisma.user.findMany({ where: { orgId: org.id }, select: { id: true } });
    if (users.length > 0) {
      await prisma.notification.createMany({
        data: users.map((u) => ({
          orgId: org.id,
          userId: u.id,
          type: "email_received",
          title: `New email from ${from}`,
          body: subject,
          actionUrl: "/mail",
          sourceWorkerId: routedWorkerId,
        })),
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        orgId: org.id,
        actorType: "system",
        actorId: "webhook",
        actorName: "Email Webhook",
        action: "created",
        entityType: "email",
        entityId: email.id,
        entityName: `Incoming email: ${subject}`,
      },
    });

    // If no customer exists, auto-create as lead
    if (!customer && from) {
      const newCustomer = await prisma.customer.create({
        data: {
          orgId: org.id,
          name: from.split("@")[0] || from,
          email: from,
          stage: "lead",
          source: "email",
          notes: `Auto-created from incoming email: ${subject}`,
          assignedWorkerId: routedWorkerId,
        },
      });

      await prisma.emailMessage.update({
        where: { id: email.id },
        data: { linkedCustomerId: newCustomer.id },
      });
    }

    return NextResponse.json({
      success: true,
      emailId: email.id,
      routedToWorker: routedWorkerId,
      customerMatched: !!customer,
      customerCreated: !customer && !!from,
    });
  } catch (err) {
    console.error("Incoming email webhook error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook processing failed" },
      { status: 500 }
    );
  }
}
