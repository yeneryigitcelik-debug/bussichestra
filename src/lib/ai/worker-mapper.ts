import type { AiWorker, WorkerKnowledge } from "@prisma/client";
import type { AIWorker, WorkerKnowledge as AIWorkerKnowledge } from "@/types/database";

/**
 * Maps a Prisma AiWorker model (camelCase) to the AIWorker interface (snake_case)
 * used throughout the AI engine (prompts, tools, etc.)
 */
export function mapPrismaWorkerToAIWorker(dbWorker: AiWorker): AIWorker {
  return {
    id: dbWorker.id,
    org_id: dbWorker.orgId,
    department_id: dbWorker.departmentId,
    name: dbWorker.name,
    role: dbWorker.role,
    persona: dbWorker.persona,
    avatar_url: dbWorker.avatarUrl,
    email: dbWorker.email,
    status: dbWorker.status as AIWorker["status"],
    tools: dbWorker.tools as string[],
    settings: dbWorker.settings as Record<string, unknown>,
    language: dbWorker.language,
    is_manager: dbWorker.isManager,
    model: dbWorker.model,
    max_tokens: dbWorker.maxTokens,
    temperature: dbWorker.temperature,
    created_at: dbWorker.createdAt.toISOString(),
    updated_at: dbWorker.updatedAt.toISOString(),
  };
}

/**
 * Maps Prisma WorkerKnowledge models (camelCase) to the AIWorkerKnowledge interface (snake_case)
 */
export function mapPrismaKnowledge(items: WorkerKnowledge[]): AIWorkerKnowledge[] {
  return items.map((k) => ({
    id: k.id,
    worker_id: k.workerId,
    org_id: k.orgId,
    category: k.category as AIWorkerKnowledge["category"],
    content: k.content,
    source: k.source as AIWorkerKnowledge["source"],
    importance: k.importance,
    expires_at: k.expiresAt?.toISOString() ?? null,
    created_at: k.createdAt.toISOString(),
    updated_at: k.updatedAt.toISOString(),
  }));
}
