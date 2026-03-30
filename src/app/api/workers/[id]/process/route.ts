import type { Prisma } from "@prisma/client";
import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/ai/claude";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { getToolsForDepartment } from "@/lib/ai/tools";
import { executeToolCall } from "@/app/api/tools/handler";
import { mapPrismaWorkerToAIWorker } from "@/lib/ai/worker-mapper";
import type Anthropic from "@anthropic-ai/sdk";

const MAX_TOOL_ITERATIONS = 5;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workerId } = await params;
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const body = await request.json();
    const { item_type, item_id } = body as {
      item_type: "task" | "message" | "email" | "alert";
      item_id: string;
    };

    if (!item_type || !item_id) {
      return NextResponse.json(
        { error: "item_type and item_id are required" },
        { status: 400 }
      );
    }

    // ----------------------------------------------------------------
    // 1. Load the worker
    // ----------------------------------------------------------------
    const dbWorker = await prisma.aiWorker.findFirst({
      where: { id: workerId, orgId },
    });

    if (!dbWorker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    const worker = mapPrismaWorkerToAIWorker(dbWorker);

    // Load org name
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    const orgName = org?.name || "Company";

    // Load worker knowledge (cast to snake_case type for buildSystemPrompt)
    const knowledgeRows = await prisma.workerKnowledge.findMany({
      where: { workerId, orgId },
      orderBy: { importance: "desc" },
      take: 20,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const knowledge = knowledgeRows as any;

    // Load colleagues
    const colleagues = await prisma.aiWorker.findMany({
      where: { orgId, id: { not: workerId } },
      select: { name: true, role: true, settings: true },
    });

    const colleagueList = colleagues.map((c) => ({
      name: c.name,
      role: c.role,
      department:
        (c.settings as Record<string, string>)?.department_name || "General",
    }));

    // ----------------------------------------------------------------
    // 2. Load the item based on type
    // ----------------------------------------------------------------
    let itemData: Record<string, unknown> | null = null;
    let promptForItem = "";

    switch (item_type) {
      case "task": {
        const task = await prisma.workerTask.findFirst({
          where: { id: item_id, orgId },
        });

        if (!task) {
          return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }
        itemData = task as unknown as Record<string, unknown>;

        // Mark task as running
        await prisma.workerTask.update({
          where: { id: item_id },
          data: { status: "running" },
        });

        promptForItem = `You received a task to process. Here are the details:

Type: ${task.type}
Priority: ${task.priority}
Instructions: ${JSON.stringify(task.input)}

Process this task and take the appropriate actions using your tools. When done, provide a summary of what you did.`;
        break;
      }
      case "message": {
        const msg = await prisma.workerMessage.findFirst({
          where: { id: item_id, orgId },
          include: { fromWorker: { select: { name: true, role: true } } },
        });

        if (!msg) {
          return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }
        itemData = msg as unknown as Record<string, unknown>;

        const fromName = msg.fromWorker?.name ?? "A colleague";
        const fromRole = msg.fromWorker?.role ?? "team member";

        promptForItem = `You received an inter-worker message from ${fromName} (${fromRole}):

Subject: ${msg.subject || "(no subject)"}
Message: ${msg.content}
Context: ${JSON.stringify(msg.context || {})}

Process this message and take any appropriate actions using your tools. Respond with what you did or your answer.`;
        break;
      }
      case "email": {
        const email = await prisma.emailMessage.findFirst({
          where: { id: item_id, orgId },
        });

        if (!email) {
          return NextResponse.json({ error: "Email not found" }, { status: 404 });
        }
        itemData = email as unknown as Record<string, unknown>;

        promptForItem = `You received an email that needs processing:

From: ${email.fromAddress}
To: ${(email.toAddresses || []).join(", ")}
Subject: ${email.subject || "(no subject)"}
Body: ${email.bodyText || email.bodyHtml || "(empty)"}

Process this email and take appropriate actions using your tools. If a response is needed, draft and send it. Provide a summary of what you did.`;
        break;
      }
      case "alert": {
        // Alerts are ephemeral — item_id is used as a description key
        const alertDetails = body.alert_details || {};

        promptForItem = `You received an alert that requires attention:

Alert Type: ${alertDetails.type || item_id}
Severity: ${alertDetails.severity || "medium"}
Title: ${alertDetails.title || "Alert"}
Details: ${JSON.stringify(alertDetails.details || {})}

Investigate this alert and take any appropriate corrective actions using your tools. Provide a summary of what you found and what you did.`;
        itemData = alertDetails;
        break;
      }
      default:
        return NextResponse.json(
          { error: `Unsupported item_type: ${item_type}` },
          { status: 400 }
        );
    }

    // ----------------------------------------------------------------
    // 3. Build system prompt and tools
    // ----------------------------------------------------------------
    const systemPrompt = buildSystemPrompt(
      worker,
      orgName,
      knowledge.length > 0 ? knowledge : undefined,
      colleagueList
    );

    const departmentName =
      (worker.settings as Record<string, string>)?.department_name || "General";
    const toolDefs = getToolsForDepartment(departmentName, worker.is_manager);
    const anthropicTools: Anthropic.Tool[] = toolDefs.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as Anthropic.Tool.InputSchema,
    }));

    // ----------------------------------------------------------------
    // 4. Call Claude API (non-streaming) with tool loop
    // ----------------------------------------------------------------
    const anthropic = getAnthropicClient();
    let messages: Anthropic.MessageParam[] = [
      { role: "user", content: promptForItem },
    ];

    let workerResponse = "";
    const actionsTaken: string[] = [];
    let iteration = 0;

    while (iteration < MAX_TOOL_ITERATIONS) {
      iteration++;

      const response = await anthropic.messages.create({
        model: worker.model || "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        ...(anthropicTools.length > 0 ? { tools: anthropicTools } : {}),
      });

      // Extract text and tool_use blocks
      const textBlocks = response.content.filter((b) => b.type === "text");
      const toolUseBlocks = response.content.filter(
        (b) => b.type === "tool_use"
      );

      // Accumulate text response
      for (const block of textBlocks) {
        if (block.type === "text") {
          workerResponse += block.text;
        }
      }

      // If no tool calls, we're done
      if (toolUseBlocks.length === 0) {
        break;
      }

      // Execute each tool call
      const toolResultContents: Anthropic.ToolResultBlockParam[] = [];

      for (const block of toolUseBlocks) {
        if (block.type !== "tool_use") continue;

        actionsTaken.push(block.name);

        let result: string;
        try {
          result = await executeToolCall(
            block.name,
            block.input as Record<string, unknown>,
            orgId
          );

          // Log activity for each tool call (fire and forget)
          prisma.activityLog.create({
            data: {
              orgId,
              actorType: "worker",
              actorId: worker.id,
              actorName: worker.name,
              action: "completed",
              entityType: block.name.split("_")[0],
              entityName: block.name,
              details: {
                tool: block.name,
                input: block.input as Prisma.InputJsonValue,
                triggered_by: `process_${item_type}`,
                item_id,
              },
            },
          }).catch((err) => console.error("Activity log failed:", err));
        } catch (err) {
          result = JSON.stringify({
            error: err instanceof Error ? err.message : "Tool execution failed",
          });
        }

        toolResultContents.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }

      // Append assistant message + tool results for next iteration
      messages = [
        ...messages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResultContents },
      ];

      // If stop_reason is end_turn (not tool_use), break
      if (response.stop_reason === "end_turn") {
        break;
      }
    }

    // ----------------------------------------------------------------
    // 5. Update item status
    // ----------------------------------------------------------------
    if (item_type === "task") {
      await prisma.workerTask.update({
        where: { id: item_id },
        data: {
          status: "completed",
          result: { response: workerResponse, actions: actionsTaken },
          completedAt: new Date(),
        },
      });
    } else if (item_type === "message") {
      await prisma.workerMessage.update({
        where: { id: item_id },
        data: { status: "responded" },
      });
    }

    // ----------------------------------------------------------------
    // 6. Create activity log entry for the processing
    // ----------------------------------------------------------------
    await prisma.activityLog.create({
      data: {
        orgId,
        actorType: "worker",
        actorId: worker.id,
        actorName: worker.name,
        action: "completed",
        entityType: "worker_task",
        entityId: item_id,
        entityName: `Processed ${item_type}`,
        details: {
          item_type,
          item_id,
          actions_taken: actionsTaken,
          response_length: workerResponse.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      worker_id: workerId,
      item_type,
      item_id,
      response: workerResponse,
      actions_taken: actionsTaken,
    });
  } catch (err) {
    console.error("Worker process endpoint error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
