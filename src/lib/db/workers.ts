import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Workers — CRUD + colleague lookup
// ---------------------------------------------------------------------------

export async function getWorkers(orgId: string) {
  return prisma.aiWorker.findMany({
    where: { orgId },
    include: { department: true },
    orderBy: { name: "asc" },
  });
}

export async function getWorker(orgId: string, workerId: string) {
  return prisma.aiWorker.findFirst({
    where: { id: workerId, orgId },
    include: { department: true },
  });
}

export async function getWorkerByName(orgId: string, name: string) {
  return prisma.aiWorker.findFirst({
    where: {
      orgId,
      name: { equals: name, mode: "insensitive" },
    },
    include: { department: true },
  });
}

export async function createWorker(
  orgId: string,
  data: {
    name: string;
    role: string;
    persona: string;
    departmentId?: string;
    avatarUrl?: string;
    email?: string;
    tools?: Prisma.InputJsonValue;
    settings?: Prisma.InputJsonValue;
    language?: string;
    isManager?: boolean;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  },
) {
  return prisma.aiWorker.create({
    data: {
      orgId,
      name: data.name,
      role: data.role,
      persona: data.persona,
      departmentId: data.departmentId,
      avatarUrl: data.avatarUrl,
      email: data.email,
      tools: data.tools ?? [],
      settings: data.settings ?? {},
      language: data.language ?? "en",
      isManager: data.isManager ?? false,
      model: data.model ?? "claude-sonnet-4-20250514",
      maxTokens: data.maxTokens ?? 4096,
      temperature: data.temperature ?? 0.7,
    },
    include: { department: true },
  });
}

export async function updateWorker(
  orgId: string,
  workerId: string,
  data: Prisma.AiWorkerUpdateInput,
) {
  return prisma.aiWorker.updateMany({
    where: { id: workerId, orgId },
    data,
  }).then(async () =>
    prisma.aiWorker.findFirst({
      where: { id: workerId, orgId },
      include: { department: true },
    }),
  );
}

export async function deleteWorker(orgId: string, workerId: string) {
  return prisma.aiWorker.deleteMany({
    where: { id: workerId, orgId },
  });
}

export async function getColleagues(orgId: string, excludeWorkerId?: string) {
  return prisma.aiWorker.findMany({
    where: {
      orgId,
      ...(excludeWorkerId ? { id: { not: excludeWorkerId } } : {}),
    },
    select: {
      id: true,
      name: true,
      role: true,
      status: true,
      isManager: true,
      department: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
}
