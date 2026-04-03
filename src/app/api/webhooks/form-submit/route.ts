import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/webhooks/form-submit
// Accepts: { api_key, org_slug, form_type, data: { name, email, phone, company, message, ...custom_fields } }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_key, org_slug, form_type, data } = body;

    if (!org_slug || !data) {
      return NextResponse.json({ error: "org_slug and data are required" }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({ where: { slug: org_slug } });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const settings = org.settings as Record<string, unknown> | null;
    const storedKey = settings?.webhook_api_key;
    if (storedKey && storedKey !== api_key) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const { name, email, phone, company, message, ...customFields } = data as Record<string, string>;

    // Check for existing customer
    let customer = email ? await prisma.customer.findFirst({
      where: { orgId: org.id, email },
    }) : null;

    // Find sales worker for assignment
    const salesWorker = await prisma.aiWorker.findFirst({
      where: { orgId: org.id, status: "active" },
      orderBy: { createdAt: "asc" },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          orgId: org.id,
          name: name || email?.split("@")[0] || "Website Visitor",
          email: email || null,
          phone: phone || null,
          company: company || null,
          stage: "lead",
          source: form_type || "website",
          notes: [
            message ? `Message: ${message}` : null,
            Object.keys(customFields).length > 0 ? `Custom: ${JSON.stringify(customFields)}` : null,
          ].filter(Boolean).join("\n"),
          assignedWorkerId: salesWorker?.id || null,
        },
      });
    }

    // Create notification
    const users = await prisma.user.findMany({ where: { orgId: org.id }, select: { id: true } });
    if (users.length > 0) {
      await prisma.notification.createMany({
        data: users.map((u) => ({
          orgId: org.id,
          userId: u.id,
          type: "customer_new",
          title: `New ${form_type || "form"} submission`,
          body: `${name || "Someone"} submitted a ${form_type || "contact"} form${company ? ` from ${company}` : ""}`,
          actionUrl: "/crm",
          sourceWorkerId: salesWorker?.id || null,
        })),
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        orgId: org.id,
        actorType: "system",
        actorId: "webhook",
        actorName: "Form Webhook",
        action: "created",
        entityType: "customer",
        entityId: customer.id,
        entityName: `New lead from ${form_type || "website"}: ${name || email || "Unknown"}`,
      },
    });

    return NextResponse.json({
      success: true,
      customerId: customer.id,
      isNew: !email || !(await prisma.customer.count({ where: { orgId: org.id, email } }) > 1),
      assignedWorker: salesWorker?.name || null,
    });
  } catch (err) {
    console.error("Form submission webhook error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook processing failed" },
      { status: 500 }
    );
  }
}
