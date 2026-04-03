import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const folder = searchParams.get("folder");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const where: Prisma.DocumentWhereInput = { orgId };

    if (type) where.type = type;
    if (folder) where.folder = folder;
    if (search) where.name = { contains: search, mode: "insensitive" };

    const [documents, count] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    return NextResponse.json({ documents, total: count });
  } catch (err) {
    console.error("List documents error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, prisma, orgId, userId } = await getAuthenticatedContext();
    if (error) return error;

    const body = await request.json();

    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: "Missing required fields: name, type" },
        { status: 400 }
      );
    }

    const document = await prisma.document.create({
      data: {
        orgId,
        name: body.name,
        type: body.type,
        description: body.description ?? null,
        mimeType: body.mime_type ?? null,
        fileUrl: body.file_url ?? null,
        fileSize: body.file_size ?? null,
        tags: body.tags ?? [],
        folder: body.folder ?? "/",
        uploadedBy: userId,
        linkedCustomerId: body.linked_customer_id ?? null,
        linkedWorkerId: body.linked_worker_id ?? null,
        isTemplate: body.is_template ?? false,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    console.error("Create document error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
