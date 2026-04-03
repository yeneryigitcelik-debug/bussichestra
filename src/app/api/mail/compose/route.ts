import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const body = await request.json();

    // Validate required fields
    if (!body.worker_id || !body.to_addresses || !body.subject || !body.body_text) {
      return NextResponse.json(
        { error: "Missing required fields: worker_id, to_addresses, subject, body_text" },
        { status: 400 }
      );
    }

    // Find or create email account for this worker
    let accountId: string;

    const existingAccount = await prisma.emailAccount.findFirst({
      where: {
        orgId,
        workerId: body.worker_id,
        isActive: true,
      },
      select: { id: true },
    });

    if (existingAccount) {
      accountId = existingAccount.id;
    } else {
      // Get worker details to create email account
      const worker = await prisma.aiWorker.findFirst({
        where: { id: body.worker_id, orgId },
        select: { id: true, name: true },
      });

      if (!worker) {
        return NextResponse.json(
          { error: "Worker not found" },
          { status: 404 }
        );
      }

      const workerSlug = worker.name.toLowerCase().replace(/\s+/g, ".");
      const emailAddress = `${workerSlug}@orchestraos.ai`;

      const newAccount = await prisma.emailAccount.create({
        data: {
          orgId,
          workerId: body.worker_id,
          emailAddress,
          displayName: worker.name,
          provider: "internal",
          isActive: true,
        },
        select: { id: true },
      });

      accountId = newAccount.id;
    }

    // Get the from address
    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
      select: { emailAddress: true },
    });

    const now = new Date();

    const email = await prisma.emailMessage.create({
      data: {
        orgId,
        accountId,
        workerId: body.worker_id,
        direction: "outbound",
        status: "sent",
        fromAddress: account?.emailAddress ?? "",
        toAddresses: Array.isArray(body.to_addresses) ? body.to_addresses : [body.to_addresses],
        ccAddresses: body.cc_addresses ?? [],
        subject: body.subject,
        bodyText: body.body_text,
        bodyHtml: body.body_html ?? null,
        linkedCustomerId: body.linked_customer_id ?? null,
        linkedInvoiceId: body.linked_invoice_id ?? null,
        sentAt: now,
      },
    });

    return NextResponse.json({ email }, { status: 201 });
  } catch (err) {
    console.error("Compose email error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
