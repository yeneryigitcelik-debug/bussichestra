import type { Prisma } from "@prisma/client";
// ============================================================
// POST /api/pipeline/email — Inbound email processing endpoint
// Saves the email, matches sender to a customer, routes to a worker,
// and optionally auto-processes it.
// ============================================================

import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api-utils";
import { getAnthropicClient } from "@/lib/ai/claude";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { getToolsForDepartment } from "@/lib/ai/tools";
import { executeToolCall } from "@/app/api/tools/handler";
import { classifyAndRoute, type PipelineEvent } from "@/lib/pipeline/router";
import type { AIWorker } from "@/types/database";
import type { ToolDefinition } from "@/types/ai";
import type Anthropic from "@anthropic-ai/sdk";

interface InboundEmail {
  from_address: string;
  to_address: string;
  subject: string;
  body_text: string;
  cc?: string[];
}

export async function POST(request: Request) {
  try {
    // ---- 1. Auth check ----
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    // ---- 2. Parse & validate body ----
    const body = await request.json() as InboundEmail;

    if (!body.from_address || !body.to_address || !body.subject || !body.body_text) {
      return NextResponse.json(
        { error: "Missing required fields: from_address, to_address, subject, body_text" },
        { status: 400 }
      );
    }

    // ---- 3. Find the email account for the to_address ----
    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        orgId,
        emailAddress: body.to_address,
        isActive: true,
      },
      select: { id: true, workerId: true },
    });

    // Use a fallback account_id if no account is found (for org-level inboxes)
    const accountId = emailAccount?.id || null;

    // ---- 4. Save to email_messages ----
    const emailRecord = await prisma.emailMessage.create({
      data: {
        orgId,
        accountId,
        workerId: emailAccount?.workerId || null,
        direction: "inbound",
        status: "received",
        fromAddress: body.from_address,
        toAddresses: [body.to_address],
        ccAddresses: body.cc || [],
        subject: body.subject,
        bodyText: body.body_text,
        bodyHtml: null,
        attachments: [],
        receivedAt: new Date(),
      },
      select: { id: true },
    });

    // ---- 5. Try to match sender to an existing customer ----
    const matchedCustomer = await prisma.customer.findFirst({
      where: { orgId, email: body.from_address },
      select: { id: true, name: true, stage: true },
    });

    // Link email to customer if found
    if (matchedCustomer) {
      await prisma.emailMessage.update({
        where: { id: emailRecord.id },
        data: { linkedCustomerId: matchedCustomer.id },
      });
    }

    // ---- 6. Build PipelineEvent from the email ----
    const event: PipelineEvent = {
      type: "email",
      subject: body.subject,
      content: body.body_text,
      from: body.from_address,
      metadata: {
        email_id: emailRecord.id,
        to_address: body.to_address,
        cc: body.cc || [],
        matched_customer_id: matchedCustomer?.id || null,
        matched_customer_name: matchedCustomer?.name || null,
      },
    };

    // ---- 7. Load workers and route ----
    const workers = await prisma.aiWorker.findMany({
      where: { orgId },
      select: { id: true, name: true, role: true, departmentId: true },
    });

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

    // If the to_address matched a worker's email account, route directly to that worker
    let routingResult = classifyAndRoute(event, workerList);

    if (emailAccount?.workerId) {
      const directWorker = workerList.find((w) => w.id === emailAccount.workerId);
      if (directWorker) {
        routingResult = {
          ...routingResult,
          target_department: directWorker.department,
          target_worker_id: directWorker.id,
          reason: `Email sent directly to ${directWorker.name}'s email address`,
        };
      }
    }

    // Resolve target worker
    const targetWorker = routingResult.target_worker_id
      ? workerList.find((w) => w.id === routingResult.target_worker_id)
      : workerList.find((w) => w.department === routingResult.target_department)
        || workerList.find((w) => w.department === "Executive")
        || workerList[0];

    if (!targetWorker) {
      return NextResponse.json(
        { error: "No workers available to handle this email" },
        { status: 404 }
      );
    }

    // ---- 8. Create worker_task ----
    const task = await prisma.workerTask.create({
      data: {
        workerId: targetWorker.id,
        orgId,
        type: "email",
        status: "pending",
        priority: routingResult.urgency,
        input: {
          event,
          email_id: emailRecord.id,
          customer: matchedCustomer || null,
        } as unknown as Prisma.InputJsonValue,
        assignedBy: "system",
      },
      select: { id: true },
    });

    // ---- 9. Notify about the email ----
    const orgUsers = await prisma.user.findMany({
      where: { orgId },
      select: { id: true },
    });

    if (orgUsers.length > 0) {
      await prisma.notification.createMany({
        data: orgUsers.map((u) => ({
          orgId,
          userId: u.id,
          type: "email_received",
          title: `New email from ${body.from_address}`,
          body: `Subject: "${body.subject}" — routed to ${targetWorker!.name} (${targetWorker!.department})`,
          sourceWorkerId: targetWorker!.id,
        })),
      });
    }

    await prisma.activityLog.create({
      data: {
        orgId,
        actorType: "system",
        actorId: "pipeline",
        actorName: "Email Pipeline",
        action: "created",
        entityType: "email",
        entityId: emailRecord.id,
        entityName: body.subject,
        details: {
          from: body.from_address,
          to: body.to_address,
          routed_to_worker: targetWorker.name,
          matched_customer: matchedCustomer?.name || null,
          routing: routingResult,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // ---- 10. Auto-process: have the worker draft a response inline ----
    let autoProcessed = false;
    let draftResponse: string | null = null;

    try {
      // Load the full worker record for system prompt
      const fullWorker = await prisma.aiWorker.findUnique({
        where: { id: targetWorker.id },
      });

      if (fullWorker) {
        const typedWorker = fullWorker as unknown as AIWorker;
        const departmentName = deptMap.get(typedWorker.department_id || "") || "Executive";

        // Load org name
        const org = await prisma.organization.findUnique({
          where: { id: orgId },
          select: { name: true },
        });
        const orgName = org?.name || "Your Company";

        // Load worker knowledge
        const knowledge = await prisma.workerKnowledge.findMany({
          where: { workerId: typedWorker.id },
          orderBy: { importance: "desc" },
          take: 20,
        });

        const systemPrompt = buildSystemPrompt(typedWorker, orgName, knowledge.length > 0 ? knowledge as unknown as import("@/types/database").WorkerKnowledge[] : undefined);

        const departmentTools = getToolsForDepartment(departmentName, typedWorker.is_manager);
        const anthropicTools: Anthropic.Tool[] = departmentTools.map((t: ToolDefinition) => ({
          name: t.name,
          description: t.description,
          input_schema: t.input_schema as Anthropic.Tool.InputSchema,
        }));

        const customerContext = matchedCustomer
          ? `\nThis email is from a known ${matchedCustomer.stage}: ${matchedCustomer.name} (Customer ID: ${matchedCustomer.id}).`
          : "\nThe sender is not yet in our CRM.";

        const prompt = `You received a new email that needs your attention.

From: ${body.from_address}
To: ${body.to_address}
Subject: ${body.subject}
${customerContext}

Email body:
---
${body.body_text}
---

Please process this email:
1. Analyze the content and determine what action is needed
2. Use any relevant tools (check customer records, look up data, etc.)
3. Draft an appropriate response email using the send_email tool
4. If the sender is not in the CRM and seems like a potential customer, create a customer record`;

        // ---- Non-streaming tool-use loop ----
        const anthropic = getAnthropicClient();
        let messages: Anthropic.MessageParam[] = [
          { role: "user", content: prompt },
        ];
        let iterations = 0;
        let finalText = "";
        const actionsTaken: string[] = [];

        while (iterations < 5) {
          iterations++;

          const response = await anthropic.messages.create({
            model: typedWorker.model || "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: systemPrompt,
            messages,
            tools: anthropicTools.length > 0 ? anthropicTools : undefined,
          });

          for (const block of response.content) {
            if (block.type === "text") {
              finalText += block.text;
            }
          }

          const toolBlocks = response.content.filter(
            (b): b is Anthropic.ContentBlock & { type: "tool_use" } =>
              b.type === "tool_use"
          );

          if (toolBlocks.length === 0 || response.stop_reason !== "tool_use") {
            break;
          }

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const tool of toolBlocks) {
            const result = await executeToolCall(
              tool.name,
              tool.input as Record<string, unknown>,
              orgId
            );
            actionsTaken.push(tool.name);
            toolResults.push({
              type: "tool_result",
              tool_use_id: tool.id,
              content: result,
            });
          }

          messages = [
            ...messages,
            { role: "assistant", content: response.content },
            { role: "user", content: toolResults },
          ];
        }

        // Update task with results
        await prisma.workerTask.update({
          where: { id: task.id },
          data: {
            status: "completed",
            result: {
              response: finalText,
              actions_taken: actionsTaken,
              iterations,
            },
            completedAt: new Date(),
          },
        });

        await prisma.activityLog.create({
          data: {
            orgId,
            actorType: "worker",
            actorId: targetWorker.id,
            actorName: targetWorker.name,
            action: "completed",
            entityType: "email",
            entityId: emailRecord.id,
            entityName: `Reply to: ${body.subject}`,
            details: { actions_taken: actionsTaken, iterations },
          },
        });

        autoProcessed = true;
        draftResponse = finalText;
      }
    } catch (processErr) {
      // Auto-processing is best-effort; the task stays pending if it fails
      console.error("Email auto-processing failed:", processErr);
    }

    // ---- 11. Return result ----
    return NextResponse.json({
      received: true,
      email_id: emailRecord.id,
      routed_to: {
        id: targetWorker.id,
        name: targetWorker.name,
        department: targetWorker.department,
      },
      matched_customer: matchedCustomer
        ? { id: matchedCustomer.id, name: matchedCustomer.name }
        : null,
      task_id: task.id,
      auto_processed: autoProcessed,
      ...(draftResponse ? { draft_response_preview: draftResponse.slice(0, 300) } : {}),
    });
  } catch (err) {
    console.error("Email pipeline error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
