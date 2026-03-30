import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Email — messages & accounts
// ---------------------------------------------------------------------------

export async function getEmails(
  orgId: string,
  filters?: {
    workerId?: string;
    direction?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  },
) {
  const where: Prisma.EmailMessageWhereInput = {
    orgId,
    ...(filters?.workerId ? { workerId: filters.workerId } : {}),
    ...(filters?.direction ? { direction: filters.direction } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.search
      ? {
          OR: [
            { subject: { contains: filters.search, mode: "insensitive" } },
            { fromAddress: { contains: filters.search, mode: "insensitive" } },
            { bodyText: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [emails, total] = await Promise.all([
    prisma.emailMessage.findMany({
      where,
      include: {
        worker: { select: { id: true, name: true } },
        account: { select: { id: true, emailAddress: true, displayName: true } },
        linkedCustomer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
    }),
    prisma.emailMessage.count({ where }),
  ]);

  return { emails, total };
}

export async function getEmail(orgId: string, emailId: string) {
  return prisma.emailMessage.findFirst({
    where: { id: emailId, orgId },
    include: {
      worker: { select: { id: true, name: true } },
      account: { select: { id: true, emailAddress: true, displayName: true } },
      linkedCustomer: { select: { id: true, name: true } },
      linkedInvoice: {
        select: { id: true, invoiceNumber: true, status: true, total: true },
      },
    },
  });
}

export async function createEmail(
  orgId: string,
  data: {
    accountId?: string;
    workerId?: string;
    direction: string;
    status?: string;
    fromAddress: string;
    toAddresses: string[];
    ccAddresses?: string[];
    subject?: string;
    bodyText?: string;
    bodyHtml?: string;
    attachments?: Prisma.InputJsonValue;
    externalId?: string;
    threadId?: string;
    linkedCustomerId?: string;
    linkedInvoiceId?: string;
    sentAt?: Date;
    receivedAt?: Date;
  },
) {
  return prisma.emailMessage.create({
    data: {
      orgId,
      accountId: data.accountId,
      workerId: data.workerId,
      direction: data.direction,
      status: data.status ?? "draft",
      fromAddress: data.fromAddress,
      toAddresses: data.toAddresses,
      ccAddresses: data.ccAddresses ?? [],
      subject: data.subject,
      bodyText: data.bodyText,
      bodyHtml: data.bodyHtml,
      attachments: data.attachments ?? [],
      externalId: data.externalId,
      threadId: data.threadId,
      linkedCustomerId: data.linkedCustomerId,
      linkedInvoiceId: data.linkedInvoiceId,
      sentAt: data.sentAt,
      receivedAt: data.receivedAt,
    },
    include: {
      worker: { select: { id: true, name: true } },
      account: { select: { id: true, emailAddress: true, displayName: true } },
    },
  });
}

// ── Email account upsert ────────────────────────────────────────────────────

export async function getOrCreateEmailAccount(orgId: string, workerId: string) {
  // Try to find an existing account for this worker
  const existing = await prisma.emailAccount.findFirst({
    where: { orgId, workerId },
  });

  if (existing) return existing;

  // Fetch worker to get their email address
  const worker = await prisma.aiWorker.findFirst({
    where: { id: workerId, orgId },
    select: { name: true, email: true },
  });

  if (!worker) {
    throw new Error(`Worker ${workerId} not found in org ${orgId}`);
  }

  const emailAddress = worker.email ?? `${worker.name.toLowerCase().replace(/\s+/g, ".")}@orchestraos.ai`;

  return prisma.emailAccount.create({
    data: {
      orgId,
      workerId,
      emailAddress,
      displayName: worker.name,
      provider: "gmail",
      credentials: {},
      isActive: true,
    },
  });
}
