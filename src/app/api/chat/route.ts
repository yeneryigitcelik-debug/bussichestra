import { NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { prepareWorkerRequest, createWorkerStream } from "@/lib/ai/worker-runner";
import { DEFAULT_WORKERS } from "@/lib/ai/prompts";
import { executeToolCall } from "@/app/api/tools/handler";
import { logActivity, createNotification } from "@/lib/activity-logger";
import type { AIWorker, Message } from "@/types/database";
import type { Prisma } from "@prisma/client";
import { AI_MODELS } from "@/lib/constants";

const MAX_TOOL_ITERATIONS = 8;

const TOOL_LABELS: Record<string, string> = {
  get_revenue_summary: "Gelir özeti alınıyor",
  get_expense_summary: "Gider özeti alınıyor",
  get_profit_loss: "Kar/zarar hesaplanıyor",
  create_invoice: "Fatura oluşturuluyor",
  list_invoices: "Faturalar listeleniyor",
  record_transaction: "İşlem kaydediliyor",
  get_cash_flow: "Nakit akışı hesaplanıyor",
  list_customers: "Müşteriler listeleniyor",
  get_customer: "Müşteri bilgisi alınıyor",
  create_customer: "Müşteri oluşturuluyor",
  update_customer_stage: "Müşteri aşaması güncelleniyor",
  get_pipeline_summary: "Pipeline özeti alınıyor",
  log_customer_interaction: "Etkileşim kaydediliyor",
  get_sales_forecast: "Satış tahmini yapılıyor",
  list_products: "Ürünler listeleniyor",
  get_product: "Ürün bilgisi alınıyor",
  update_stock: "Stok güncelleniyor",
  create_product: "Ürün oluşturuluyor",
  get_inventory_alerts: "Stok uyarıları kontrol ediliyor",
  get_inventory_valuation: "Envanter değerlemesi yapılıyor",
  list_projects: "Projeler listeleniyor",
  create_project: "Proje oluşturuluyor",
  create_task: "Görev oluşturuluyor",
  update_task_status: "Görev durumu güncelleniyor",
  send_email: "E-posta gönderiliyor",
  list_emails: "E-postalar listeleniyor",
  get_email: "E-posta alınıyor",
  list_documents: "Dokümanlar listeleniyor",
  get_document: "Doküman alınıyor",
  delegate_to_worker: "Görev delege ediliyor",
  query_worker: "Çalışan sorgulanıyor",
  summarize_department: "Departman özeti alınıyor",
  list_all_workers: "Tüm çalışanlar listeleniyor",
};

function buildSeedWorker(id: string, config: (typeof DEFAULT_WORKERS)[keyof typeof DEFAULT_WORKERS]): AIWorker {
  return {
    id, org_id: "demo-org", department_id: id,
    name: config.name, role: config.role, persona: config.persona,
    avatar_url: null, email: `${id}@orchestraos.com`, status: "active",
    tools: config.tools, settings: { department_name: config.department },
    language: "en",
    is_manager: "is_manager" in config ? Boolean((config as Record<string, unknown>).is_manager) : false,
    model: "is_manager" in config ? AI_MODELS.MANAGER : AI_MODELS.WORKER,
    max_tokens: 4096, temperature: 0.7,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
}

const SEED_WORKERS: Record<string, AIWorker> = Object.fromEntries(
  Object.entries(DEFAULT_WORKERS).map(([key, config]) => [key, buildSeedWorker(key, config)])
);

const COLLEAGUES = Object.values(SEED_WORKERS).map((w) => ({
  name: w.name, role: w.role,
  department: (w.settings as Record<string, string>).department_name || "General",
}));

function sendSSE(controller: ReadableStreamDefaultController, encoder: TextEncoder, data: unknown) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workerId, message, conversationId } = body;

    if (!workerId || !message) {
      return NextResponse.json({ error: "workerId and message are required" }, { status: 400 });
    }

    // Auth check
    const session = await auth();
    const isAuthenticated = !!session?.user?.id;

    let worker: AIWorker;
    let orgName = "Demo Company";
    let orgId = "demo-org";
    let history: Message[] = [];
    let convId = conversationId;
    let colleagues = COLLEAGUES;

    if (isAuthenticated && session.user.orgId) {
      orgId = session.user.orgId;

      // Load worker from DB
      const dbWorker = await prisma.aiWorker.findFirst({
        where: { id: workerId, orgId },
      });

      if (dbWorker) {
        worker = {
          id: dbWorker.id, org_id: dbWorker.orgId, department_id: dbWorker.departmentId || "",
          name: dbWorker.name, role: dbWorker.role, persona: dbWorker.persona,
          avatar_url: dbWorker.avatarUrl, email: dbWorker.email,
          status: dbWorker.status as AIWorker["status"],
          tools: dbWorker.tools as string[], settings: dbWorker.settings as Record<string, unknown>,
          language: dbWorker.language, is_manager: dbWorker.isManager,
          model: dbWorker.model, max_tokens: dbWorker.maxTokens, temperature: dbWorker.temperature,
          created_at: dbWorker.createdAt.toISOString(), updated_at: dbWorker.updatedAt.toISOString(),
        };
      } else {
        worker = SEED_WORKERS[workerId];
      }

      // Load org name
      const org = await prisma.organization.findUnique({
        where: { id: orgId }, select: { name: true },
      });
      if (org) orgName = org.name;

      // Load colleagues
      const dbWorkers = await prisma.aiWorker.findMany({
        where: { orgId, id: { not: workerId } },
        select: { name: true, role: true, settings: true },
      });
      if (dbWorkers.length > 0) {
        colleagues = dbWorkers.map((w) => ({
          name: w.name, role: w.role,
          department: (w.settings as Record<string, string>)?.department_name || "General",
        }));
      }

      // Create or load conversation
      if (!convId) {
        const conv = await prisma.conversation.create({
          data: {
            orgId, workerId, userId: session.user.id,
            title: message.slice(0, 100),
          },
        });
        convId = conv.id;
      }

      // Load history
      if (convId) {
        const messages = await prisma.message.findMany({
          where: { conversationId: convId },
          orderBy: { createdAt: "asc" },
          take: 50,
        });
        history = messages as unknown as Message[];

        // Save user message
        await prisma.message.create({
          data: { conversationId: convId, role: "user", content: message },
        });
      }
    } else {
      // Demo mode
      worker = SEED_WORKERS[workerId];
    }

    if (!worker) {
      return NextResponse.json({ error: `Worker "${workerId}" not found` }, { status: 404 });
    }

    const prepared = prepareWorkerRequest({
      worker, orgName, userMessage: message, history,
      colleagues: colleagues.filter((c) => c.name !== worker.name),
    });

    const encoder = new TextEncoder();
    let fullTextResponse = "";
    const allToolCalls: { name: string; input: Record<string, unknown>; result: string }[] = [];

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let currentMessages = [...prepared.messages];
          let iteration = 0;

          while (iteration < MAX_TOOL_ITERATIONS) {
            iteration++;

            const stream = await createWorkerStream({ ...prepared, messages: currentMessages });

            let iterationText = "";
            const toolUseBlocks: { id: string; name: string; input: Record<string, unknown> }[] = [];
            let currentToolId = "";
            let currentToolName = "";
            let inputJsonStr = "";

            for await (const event of stream) {
              if (event.type === "content_block_start") {
                const block = event.content_block;
                if (block.type === "tool_use") {
                  currentToolId = block.id;
                  currentToolName = block.name;
                  inputJsonStr = "";
                  sendSSE(controller, encoder, {
                    type: "tool_start", name: block.name,
                    label: TOOL_LABELS[block.name] || block.name, id: block.id,
                  });
                }
              } else if (event.type === "content_block_delta") {
                if (event.delta.type === "text_delta") {
                  iterationText += event.delta.text;
                  fullTextResponse += event.delta.text;
                  sendSSE(controller, encoder, { type: "text", content: event.delta.text });
                } else if (event.delta.type === "input_json_delta") {
                  inputJsonStr += event.delta.partial_json;
                }
              } else if (event.type === "content_block_stop") {
                if (currentToolId && currentToolName) {
                  try {
                    const input = inputJsonStr ? JSON.parse(inputJsonStr) : {};
                    toolUseBlocks.push({ id: currentToolId, name: currentToolName, input });
                  } catch {
                    toolUseBlocks.push({ id: currentToolId, name: currentToolName, input: {} });
                  }
                  currentToolId = "";
                  currentToolName = "";
                  inputJsonStr = "";
                }
              }
            }

            if (toolUseBlocks.length === 0) break;

            const toolResults: Anthropic.MessageParam = { role: "user", content: [] };
            const assistantContent: Anthropic.ContentBlockParam[] = [];
            if (iterationText) assistantContent.push({ type: "text", text: iterationText });

            for (const tool of toolUseBlocks) {
              assistantContent.push({ type: "tool_use", id: tool.id, name: tool.name, input: tool.input });

              let result: string;
              try {
                if (orgId !== "demo-org") {
                  result = await executeToolCall(tool.name, tool.input, orgId);

                  logActivity({
                    orgId, actorType: "worker", actorId: worker.id, actorName: worker.name,
                    action: "completed", entityType: tool.name.split("_")[0], entityName: tool.name,
                    details: { tool: tool.name, input: tool.input },
                  });
                } else {
                  result = getDemoToolResult(tool.name, tool.input);
                }
              } catch (err) {
                result = JSON.stringify({ error: err instanceof Error ? err.message : "Tool execution failed" });
              }

              allToolCalls.push({ name: tool.name, input: tool.input, result });

              let parsedResult: unknown;
              try { parsedResult = JSON.parse(result); } catch { parsedResult = result; }

              sendSSE(controller, encoder, {
                type: "tool_result", name: tool.name,
                label: TOOL_LABELS[tool.name] || tool.name, id: tool.id, result: parsedResult,
              });

              (toolResults.content as Anthropic.ToolResultBlockParam[]).push({
                type: "tool_result", tool_use_id: tool.id, content: result,
              });
            }

            currentMessages = [
              ...currentMessages,
              { role: "assistant" as const, content: assistantContent },
              toolResults,
            ];
          }

          // Save to DB
          if (isAuthenticated && convId && (fullTextResponse || allToolCalls.length > 0)) {
            await prisma.message.create({
              data: {
                conversationId: convId,
                role: "assistant",
                content: fullTextResponse,
                toolCalls: allToolCalls.length > 0 ? allToolCalls.map((tc) => ({
                  name: tc.name, input: tc.input,
                })) as unknown as Prisma.InputJsonValue : undefined,
                toolResults: allToolCalls.length > 0 ? allToolCalls.map((tc) => {
                  try { return { name: tc.name, result: JSON.parse(tc.result) }; }
                  catch { return { name: tc.name, result: tc.result }; }
                }) as unknown as Prisma.InputJsonValue : undefined,
              },
            });

            await prisma.conversation.update({
              where: { id: convId },
              data: { updatedAt: new Date() },
            });

            if (allToolCalls.some((tc) => tc.name.startsWith("create_"))) {
              createNotification({
                orgId, type: "task_completed",
                title: `${worker.name} bir işlem tamamladı`,
                body: allToolCalls.map((tc) => TOOL_LABELS[tc.name] || tc.name).join(", "),
                actionUrl: `/chat/${workerId}`,
                sourceWorkerId: worker.id,
              });
            }
          }

          if (convId) sendSSE(controller, encoder, { type: "meta", conversationId: convId });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Stream error";
          sendSSE(controller, encoder, { type: "error", content: errorMessage });
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}

function getDemoToolResult(toolName: string, input: Record<string, unknown>): string {
  const demoResults: Record<string, unknown> = {
    get_revenue_summary: { total_revenue: 148500, period: "this_month", currency: "USD", transactions_count: 23 },
    get_expense_summary: { total_expenses: 67200, period: "this_month", currency: "USD" },
    get_profit_loss: { revenue: 148500, expenses: 67200, net_profit: 81300, profit_margin: "54.7%" },
    list_invoices: { invoices: [{ id: "INV-001", customer: "Acme Corp", total: 25000, status: "paid" }], total_count: 1 },
    create_invoice: { success: true, invoice: { id: "INV-NEW", status: "draft", total: input.total || 0 } },
    record_transaction: { success: true, transaction: { id: "TRX-NEW", type: input.type || "income", amount: input.amount || 0 } },
    get_cash_flow: { inflows: 148500, outflows: 67200, net_flow: 81300, trend: "positive" },
    list_customers: { customers: [{ name: "Acme Corp", stage: "customer", lifetime_value: 125000 }], total_count: 1 },
    get_pipeline_summary: { stages: [{ stage: "lead", count: 12 }, { stage: "customer", count: 15 }], total_pipeline_value: 770000 },
    get_sales_forecast: { current_month: 148500, next_month_forecast: 162000, growth_rate: "9.1%" },
    list_products: { products: [{ name: "Premium Plan", sku: "PLAN-PRE", quantity: 999, price: 99 }], total_count: 1 },
    get_inventory_alerts: { alerts: [{ product: "API Credits", current_stock: 5, reorder_at: 10 }], total_alerts: 1 },
    list_projects: { projects: [{ name: "Website Redesign", status: "active", progress: 65 }], total_count: 1 },
    list_all_workers: { workers: [{ name: "Ayşe", role: "CFO", status: "active" }, { name: "Marco", role: "Sales", status: "active" }] },
  };
  const result = demoResults[toolName];
  if (result) return JSON.stringify(result);
  return JSON.stringify({ message: `Demo result for ${toolName}`, input });
}
