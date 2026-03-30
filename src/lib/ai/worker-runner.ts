import type Anthropic from "@anthropic-ai/sdk";
import { createStreamingChat } from "./claude";
import { buildSystemPrompt } from "./prompts";
import { getToolsForDepartment } from "./tools";
import type { AIWorker, Message, WorkerKnowledge } from "@/types/database";

export interface RunWorkerParams {
  worker: AIWorker;
  orgName: string;
  userMessage: string;
  history: Message[];
  knowledge?: WorkerKnowledge[];
  colleagues?: { name: string; role: string; department: string }[];
}

export interface PreparedWorkerRequest {
  systemPrompt: string;
  tools: Anthropic.Tool[];
  messages: Anthropic.MessageParam[];
  model: string;
}

function convertToAnthropicMessages(
  history: Message[]
): Anthropic.MessageParam[] {
  return history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
}

/**
 * Prepares all parameters needed for a Claude API call without actually making it.
 * This allows the chat route to manage the tool execution loop.
 */
export function prepareWorkerRequest(params: RunWorkerParams): PreparedWorkerRequest {
  const { worker, orgName, userMessage, history, knowledge, colleagues } = params;

  const systemPrompt = buildSystemPrompt(worker, orgName, knowledge, colleagues);

  const departmentName = (worker.settings as Record<string, string>)?.department_name || "General";
  const toolDefs = getToolsForDepartment(departmentName, worker.is_manager);

  const tools: Anthropic.Tool[] = toolDefs.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Tool.InputSchema,
  }));

  const messages: Anthropic.MessageParam[] = [
    ...convertToAnthropicMessages(history),
    { role: "user", content: userMessage },
  ];

  return {
    systemPrompt,
    tools,
    messages,
    model: worker.model || "claude-sonnet-4-20250514",
  };
}

/**
 * Creates a streaming chat with the prepared request parameters.
 */
export async function createWorkerStream(prepared: PreparedWorkerRequest) {
  return await createStreamingChat({
    systemPrompt: prepared.systemPrompt,
    messages: prepared.messages,
    tools: prepared.tools.length > 0 ? prepared.tools : undefined,
    model: prepared.model,
  });
}

/**
 * Legacy function - runs a worker stream directly (without tool loop).
 */
export async function runWorkerStream(params: RunWorkerParams) {
  const prepared = prepareWorkerRequest(params);
  return await createWorkerStream(prepared);
}
