import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/webhooks/payment
// Accepts: { api_key, org_slug, invoice_number?, customer_email?, amount, currency, payment_method, reference, status }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_key, org_slug, invoice_number, customer_email, amount, currency, payment_method, reference, status } = body;

    if (!org_slug || !amount) {
      return NextResponse.json({ error: "org_slug and amount are required" }, { status: 400 });
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

    let invoice = null;
    let customer = null;

    // Find invoice by number
    if (invoice_number) {
      invoice = await prisma.invoice.findFirst({
        where: { orgId: org.id, invoiceNumber: invoice_number },
        include: { customer: true },
      });
      customer = invoice?.customer || null;
    }

    // Or find customer by email
    if (!customer && customer_email) {
      customer = await prisma.customer.findFirst({
        where: { orgId: org.id, email: customer_email },
      });
      // Find their latest outstanding invoice
      if (customer && !invoice) {
        invoice = await prisma.invoice.findFirst({
          where: { orgId: org.id, customerId: customer.id, status: { in: ["sent", "overdue"] } },
          orderBy: { createdAt: "desc" },
        });
      }
    }

    const paymentStatus = status || "completed";

    // Record transaction
    const transaction = await prisma.transaction.create({
      data: {
        orgId: org.id,
        type: "income",
        amount: Number(amount),
        currency: currency || "USD",
        category: "Payment",
        description: `Payment received${invoice ? ` for ${invoice.invoiceNumber}` : ""}${customer ? ` from ${customer.name}` : ""}`,
        customerId: customer?.id || null,
        invoiceId: invoice?.id || null,
        paymentMethod: payment_method || "external",
        referenceNumber: reference || null,
        date: new Date(),
      },
    });

    // Update invoice status
    if (invoice && paymentStatus === "completed") {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "paid", paidAt: new Date() },
      });
    }

    // Update customer lifetime value
    if (customer) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          lifetimeValue: { increment: Number(amount) },
          lastContactAt: new Date(),
        },
      });
    }

    // Notify
    const users = await prisma.user.findMany({ where: { orgId: org.id }, select: { id: true } });
    if (users.length > 0) {
      await prisma.notification.createMany({
        data: users.map((u) => ({
          orgId: org.id,
          userId: u.id,
          type: "invoice_paid",
          title: `Payment received: $${Number(amount).toLocaleString()}`,
          body: `${customer?.name || "Unknown"} paid${invoice ? ` invoice ${invoice.invoiceNumber}` : ""} via ${payment_method || "external"}`,
          actionUrl: "/finance",
        })),
      });
    }

    // Log
    await prisma.activityLog.create({
      data: {
        orgId: org.id,
        actorType: "system",
        actorId: "webhook",
        actorName: "Payment Webhook",
        action: "created",
        entityType: "transaction",
        entityId: transaction.id,
        entityName: `Payment $${Number(amount).toLocaleString()} received${invoice ? ` for ${invoice.invoiceNumber}` : ""}`,
      },
    });

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      invoiceUpdated: !!invoice && paymentStatus === "completed",
      invoiceId: invoice?.id || null,
      customerId: customer?.id || null,
    });
  } catch (err) {
    console.error("Payment webhook error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook processing failed" },
      { status: 500 }
    );
  }
}
