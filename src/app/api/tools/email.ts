import { prisma } from "@/lib/prisma";

export async function handleEmailTool(
  toolName: string,
  input: Record<string, unknown>,
  orgId: string,
): Promise<string> {
  switch (toolName) {
    case "send_email":
      return await sendEmail(input, orgId);
    case "list_emails":
      return await listEmails(input, orgId);
    case "get_email":
      return await getEmail(input, orgId);
    default:
      return JSON.stringify({ error: `Unknown email tool: ${toolName}` });
  }
}

async function sendEmail(
  input: Record<string, unknown>,
  orgId: string,
): Promise<string> {
  const to = input.to as string | string[];
  const subject = String(input.subject || "");
  const body = String(input.body || input.body_text || "");
  const cc = input.cc as string[] | undefined;
  const workerId = input.worker_id as string | undefined;

  if (!to || !subject) {
    return JSON.stringify({ error: "to and subject are required" });
  }

  const toAddresses = Array.isArray(to) ? to : [to];

  // Find or create email account for the worker
  let accountId: string | null = null;
  let fromAddress = "system@orchestraos.ai";

  if (workerId) {
    const account = await prisma.emailAccount.findFirst({
      where: { workerId, orgId },
      select: { id: true, emailAddress: true },
    });

    if (account) {
      accountId = account.id;
      fromAddress = account.emailAddress;
    } else {
      // Get worker email
      const worker = await prisma.aiWorker.findUnique({
        where: { id: workerId },
        select: { email: true, name: true },
      });

      if (worker?.email) {
        fromAddress = worker.email;
        const newAccount = await prisma.emailAccount.create({
          data: {
            orgId,
            workerId,
            emailAddress: worker.email,
            displayName: worker.name,
            provider: "system",
            isActive: true,
          },
          select: { id: true },
        });
        accountId = newAccount.id;
      }
    }
  }

  const email = await prisma.emailMessage.create({
    data: {
      orgId,
      accountId,
      workerId: workerId || null,
      direction: "outbound",
      status: "sent",
      fromAddress,
      toAddresses,
      ccAddresses: cc || [],
      subject,
      bodyText: body,
      sentAt: new Date(),
    },
    select: { id: true },
  });

  return JSON.stringify({
    success: true,
    message: `Email sent to ${toAddresses.join(", ")}`,
    email_id: email.id,
    from: fromAddress,
    to: toAddresses,
    subject,
  });
}

async function listEmails(
  input: Record<string, unknown>,
  orgId: string,
): Promise<string> {
  const direction = input.direction as string | undefined;
  const limit = Number(input.limit) || 20;

  const where: Record<string, unknown> = { orgId };
  if (direction) where.direction = direction;

  const emails = await prisma.emailMessage.findMany({
    where,
    select: {
      id: true, fromAddress: true, toAddresses: true, subject: true,
      bodyText: true, direction: true, status: true, sentAt: true,
      receivedAt: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return JSON.stringify({
    emails: emails.map((e) => ({
      id: e.id,
      from: e.fromAddress,
      to: e.toAddresses,
      subject: e.subject,
      preview: e.bodyText?.slice(0, 100) || "",
      direction: e.direction,
      status: e.status,
      date: e.sentAt || e.receivedAt || e.createdAt,
    })),
    total: emails.length,
  });
}

async function getEmail(
  input: Record<string, unknown>,
  orgId: string,
): Promise<string> {
  const emailId = String(input.email_id || input.id || "");

  if (!emailId) {
    return JSON.stringify({ error: "email_id is required" });
  }

  const email = await prisma.emailMessage.findFirst({
    where: { id: emailId, orgId },
  });

  if (!email) {
    return JSON.stringify({ error: "Email not found" });
  }

  return JSON.stringify({
    id: email.id,
    from: email.fromAddress,
    to: email.toAddresses,
    cc: email.ccAddresses,
    subject: email.subject,
    body: email.bodyText,
    direction: email.direction,
    status: email.status,
    date: email.sentAt || email.receivedAt || email.createdAt,
  });
}
