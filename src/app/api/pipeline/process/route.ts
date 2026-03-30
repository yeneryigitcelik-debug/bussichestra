import type { Prisma } from "@prisma/client";
// ============================================================
// POST /api/pipeline/process — Process pending worker tasks
// Optionally scoped to a single worker, otherwise processes all.
// ============================================================

import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api-utils";
import { getAnthropicClient } from "@/lib/ai/claude";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { getToolsForDepartment } from "@/lib/ai/tools";
import { executeToolCall } from "@/app/api/tools/handler";
import type { AIWorker } from "@/types/database";
import type { ToolDefinition } from "@/types/ai";
import type Anthropic from "@anthropic-ai/sdk";

interface ProcessResult {
  worker: string;
  task_id: string;
  status: "completed" | "failed";
  actions: string[];
  summary: string;
}

export async function POST(request: Request) {
  try {
    // ---- 1. Auth check ----
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const body = await request.json().catch(() => ({})) as { worker_id?: string };

    // ---- 2. Load workers to process ----
    const workers = await prisma.aiWorker.findMany({
      where: {
        orgId,
        ...(body.worker_id ? { id: body.worker_id } : {}),
      },
    });

    if (!workers.length) {
      return NextResponse.json(
        { error: body.worker_id ? "Worker not found" : "No workers found" },
        { status: 404 }
      );
    }

    // Load org name for system prompt
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    const orgName = org?.name || "Your Company";

    // Load departments for mapping
    const departments = await prisma.department.findMany({
      where: { orgId },
      select: { id: true, name: true },
    });

    const deptMap = new Map<string, string>();
    for (const dept of departments) {
      deptMap.set(dept.id, dept.name);
    }

    const anthropic = getAnthropicClient();
    const results: ProcessResult[] = [];

    // ---- 3. Process each worker's pending tasks ----
    for (const worker of workers as unknown as AIWorker[]) {
      const departmentName = deptMap.get(worker.department_id || "") || "Executive";

      // Fetch pending tasks (max 5 per worker)
      const tasks = await prisma.workerTask.findMany({
        where: {
          workerId: worker.id,
          orgId,
          status: "pending",
        },
        orderBy: { createdAt: "asc" },
        take: 5,
      });

      if (!tasks.length) {
        continue; // No pending tasks for this worker
      }

      // Load worker knowledge for context
      const knowledge = await prisma.workerKnowledge.findMany({
        where: { workerId: worker.id },
        orderBy: { importance: "desc" },
        take: 20,
      });

      // Load colleagues for awareness
      const colleagues = (workers as unknown as AIWorker[])
        .filter((w) => w.id !== worker.id)
        .map((w) => ({
          name: w.name,
          role: w.role,
          department: deptMap.get(w.department_id || "") || "Executive",
        }));

      // Build system prompt
      const systemPrompt = buildSystemPrompt(
        worker,
        orgName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        knowledge.length > 0 ? knowledge as any : undefined,
        colleagues
      );

      // Get tools for this worker's department
      const departmentTools = getToolsForDepartment(departmentName, worker.is_manager);
      const anthropicTools: Anthropic.Tool[] = departmentTools.map((t: ToolDefinition) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema as Anthropic.Tool.InputSchema,
      }));

      // Process each task
      for (const task of tasks) {
        // Mark task as running
        await prisma.workerTask.update({
          where: { id: task.id },
          data: { status: "running" },
        });

        try {
          const eventData = (task.input as Record<string, unknown>)?.event as Record<string, unknown> | undefined;
          const eventType = eventData?.type || task.type || "task";
          const eventSubject = eventData?.subject || "Pending task";
          const eventContent = eventData?.content || JSON.stringify(task.input);

          const prompt = `You have a new ${eventType} to handle.

Subject: ${eventSubject}

Details:
${eventContent}

${eventData?.from ? `From: ${eventData.from}` : ""}
${eventData?.metadata ? `Additional context: ${JSON.stringify(eventData.metadata)}` : ""}

Process this and take appropriate action using your tools. If you need to respond to an email, draft a response. If it's a financial matter, pull relevant data. Be thorough and proactive.`;

          // ---- Non-streaming tool-use loop ----
          let messages: Anthropic.MessageParam[] = [
            { role: "user", content: prompt },
          ];
          let iterations = 0;
          let finalText = "";
          const actionsTaken: string[] = [];

          while (iterations < 5) {
            iterations++;

            const response = await anthropic.messages.create({
              model: worker.model || "claude-sonnet-4-20250514",
              max_tokens: 4096,
              system: systemPrompt,
              messages,
              tools: anthropicTools.length > 0 ? anthropicTools : undefined,
            });

            // Collect text blocks
            for (const block of response.content) {
              if (block.type === "text") {
                finalText += block.text;
              }
            }

            // Check for tool use
            const toolBlocks = response.content.filter(
              (b): b is Anthropic.ContentBlock & { type: "tool_use" } =>
                b.type === "tool_use"
            );

            if (toolBlocks.length === 0 || response.stop_reason !== "tool_use") {
              break;
            }

            // Execute each tool call
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

            // Append assistant + tool results and continue the loop
            messages = [
              ...messages,
              { role: "assistant", content: response.content },
              { role: "user", content: toolResults },
            ];
          }

          // ---- Update task as completed ----
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

          // Log activity
          await prisma.activityLog.create({
            data: {
              orgId,
              actorType: "worker",
              actorId: worker.id,
              actorName: worker.name,
              action: "completed",
              entityType: "worker_task",
              entityId: task.id,
              entityName: `${task.type}: ${eventSubject}`,
              details: {
                actions_taken: actionsTaken,
                iterations,
              },
            },
          });

          results.push({
            worker: worker.name,
            task_id: task.id,
            status: "completed",
            actions: actionsTaken,
            summary: finalText.slice(0, 200),
          });
        } catch (taskErr) {
          const errorMessage = taskErr instanceof Error ? taskErr.message : "Unknown error";
          console.error(`Task ${task.id} failed for worker ${worker.name}:`, taskErr);

          // Mark task as failed
          await prisma.workerTask.update({
            where: { id: task.id },
            data: {
              status: "failed",
              errorMessage,
              retryCount: (task.retryCount || 0) + 1,
            },
          });

          await prisma.activityLog.create({
            data: {
              orgId,
              actorType: "worker",
              actorId: worker.id,
              actorName: worker.name,
              action: "failed",
              entityType: "worker_task",
              entityId: task.id,
              entityName: `${task.type}`,
              details: { error: errorMessage },
            },
          });

          results.push({
            worker: worker.name,
            task_id: task.id,
            status: "failed",
            actions: [],
            summary: errorMessage,
          });
        }
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (err) {
    console.error("Pipeline process error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
