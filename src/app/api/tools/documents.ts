import { prisma } from "@/lib/prisma";

export async function handleDocumentTool(
  toolName: string,
  input: Record<string, unknown>,
  orgId: string,
): Promise<string> {
  switch (toolName) {
    case "list_documents":
      return await listDocuments(input, orgId);
    case "get_document":
      return await getDocument(input, orgId);
    default:
      return JSON.stringify({ error: `Unknown document tool: ${toolName}` });
  }
}

async function listDocuments(
  input: Record<string, unknown>,
  orgId: string,
): Promise<string> {
  const type = input.type as string | undefined;
  const folder = input.folder as string | undefined;
  const limit = Number(input.limit) || 20;

  const where: Record<string, unknown> = { orgId };
  if (type) where.type = type;
  if (folder) where.folder = folder;

  const docs = await prisma.document.findMany({
    where,
    select: {
      id: true, name: true, type: true, mimeType: true, fileSize: true,
      description: true, folder: true, tags: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return JSON.stringify({
    documents: docs.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      size: d.fileSize,
      folder: d.folder,
      description: d.description,
      created_at: d.createdAt,
    })),
    total: docs.length,
  });
}

async function getDocument(
  input: Record<string, unknown>,
  orgId: string,
): Promise<string> {
  const docId = String(input.document_id || input.id || "");

  if (!docId) {
    return JSON.stringify({ error: "document_id is required" });
  }

  const doc = await prisma.document.findFirst({
    where: { id: docId, orgId },
  });

  if (!doc) {
    return JSON.stringify({ error: "Document not found" });
  }

  return JSON.stringify({
    id: doc.id,
    name: doc.name,
    type: doc.type,
    description: doc.description,
    mime_type: doc.mimeType,
    file_url: doc.fileUrl,
    file_size: doc.fileSize,
    folder: doc.folder,
    tags: doc.tags,
    is_template: doc.isTemplate,
    version: doc.version,
    created_at: doc.createdAt,
  });
}
