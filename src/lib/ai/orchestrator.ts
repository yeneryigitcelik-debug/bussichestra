import type { AIWorker } from "@/types/database";
import { createStreamingChat } from "./claude";
import { buildManagerPrompt } from "./prompts";
import { getToolsForDepartment } from "./tools";
import type Anthropic from "@anthropic-ai/sdk";
import { AI_MODELS } from "@/lib/constants";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string;
  status: string;
}

interface OrchestratorParams {
  manager: AIWorker;
  orgName: string;
  teamMembers: TeamMember[];
  userMessage: string;
  history: Anthropic.MessageParam[];
}

/**
 * Run the manager/orchestrator — the AI that delegates across departments.
 * Uses Opus model for higher reasoning capability.
 */
export async function runOrchestratorStream(params: OrchestratorParams) {
  const { manager, orgName, teamMembers, userMessage, history } = params;

  const systemPrompt = buildManagerPrompt(manager, orgName, teamMembers);
  const tools = getToolsForDepartment(manager.settings?.department as string || "Executive", true);

  // Convert tool definitions to Anthropic format
  const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Tool.InputSchema,
  }));

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  return createStreamingChat({
    systemPrompt,
    messages,
    tools: anthropicTools,
    model: AI_MODELS.MANAGER,
  });
}

/**
 * Execute a cross-department query — one worker asks another worker a question.
 * Used by the manager's "query_worker" tool.
 */
export async function queryWorker(
  targetWorker: AIWorker,
  question: string,
  orgName: string
): Promise<string> {
  const { getAnthropicClient } = await import("./claude");
  const { buildSystemPrompt } = await import("./prompts");

  const anthropic = getAnthropicClient();
  const systemPrompt = buildSystemPrompt(targetWorker, orgName);

  const response = await anthropic.messages.create({
    model: AI_MODELS.WORKER,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `[Internal query from management] ${question}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "No response from worker.";
}
