import Anthropic from "@anthropic-ai/sdk";
import { AI_MODELS } from "@/lib/constants";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  return client;
}

export async function createStreamingChat(params: {
  systemPrompt: string;
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  model?: string;
}) {
  const anthropic = getAnthropicClient();

  return anthropic.messages.stream({
    model: params.model || AI_MODELS.WORKER,
    max_tokens: 4096,
    system: params.systemPrompt,
    messages: params.messages,
    ...(params.tools?.length ? { tools: params.tools } : {}),
  });
}
