import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function getDocuments(
  orgId: string,
  filters?: {
    type?: string;
    folder?: string;
    search?: string;
    limit?: number;
    offset?: number;
  },
) {
  const where: Prisma.DocumentWhereInput = {
    orgId,
    ...(filters?.type ? { type: filters.type } : {}),
    ...(filters?.folder ? { folder: filters.folder } : {}),
    ...(filters?.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        uploader: { select: { id: true, name: true } },
        linkedWorker: { select: { id: true, name: true } },
        linkedCustomer: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
    }),
    prisma.document.count({ where }),
  ]);

  return { documents, total };
}

export async function getDocument(orgId: string, documentId: string) {
  return prisma.document.findFirst({
    where: { id: documentId, orgId },
    include: {
      uploader: { select: { id: true, name: true } },
      linkedWorker: { select: { id: true, name: true } },
      linkedCustomer: { select: { id: true, name: true } },
    },
  });
}

export async function createDocument(
  orgId: string,
  data: {
    name: string;
    type: string;
    mimeType?: string;
    fileUrl?: string;
    fileSize?: number;
    description?: string;
    tags?: string[];
    folder?: string;
    uploadedBy?: string;
    linkedCustomerId?: string;
    linkedWorkerId?: string;
    isTemplate?: boolean;
    version?: number;
  },
) {
  return prisma.document.create({
    data: {
      orgId,
      name: data.name,
      type: data.type,
      mimeType: data.mimeType,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize,
      description: data.description,
      tags: data.tags ?? [],
      folder: data.folder ?? "/",
      uploadedBy: data.uploadedBy,
      linkedCustomerId: data.linkedCustomerId,
      linkedWorkerId: data.linkedWorkerId,
      isTemplate: data.isTemplate ?? false,
      version: data.version ?? 1,
    },
    include: {
      uploader: { select: { id: true, name: true } },
      linkedWorker: { select: { id: true, name: true } },
      linkedCustomer: { select: { id: true, name: true } },
    },
  });
}
