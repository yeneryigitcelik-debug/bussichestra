import type { AIWorker } from "./database";

export interface ChatRequest {
  workerId: string;
  message: string;
  conversationId?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface WorkerConfig {
  worker: AIWorker;
  departmentName: string;
  orgName: string;
}

export interface StreamChunk {
  type: "text" | "tool_use" | "tool_result" | "error" | "done";
  content: string;
  toolCall?: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface DelegationRequest {
  fromWorkerId: string;
  toWorkerId: string;
  taskType: string;
  instructions: string;
  priority: "low" | "medium" | "high" | "urgent";
}

export interface WorkerQueryRequest {
  fromWorkerId: string;
  toWorkerId: string;
  question: string;
}

export interface WorkerQueryResponse {
  workerId: string;
  workerName: string;
  response: string;
}
