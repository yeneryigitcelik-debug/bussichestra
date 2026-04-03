import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const isActive = searchParams.get("is_active");
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const where: Prisma.ProductWhereInput = { orgId };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const [products, count] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({ products, total: count });
  } catch (err) {
    console.error("List products error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.sku || body.price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: name, sku, price" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        orgId,
        name: body.name,
        sku: body.sku,
        price: body.price,
        description: body.description ?? null,
        category: body.category ?? null,
        quantity: body.quantity ?? 0,
        reorderAt: body.reorder_at ?? 0,
        costPrice: body.cost_price ?? null,
        unit: body.unit ?? "piece",
        supplier: body.supplier ?? null,
        barcode: body.barcode ?? null,
        location: body.location ?? null,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    console.error("Create product error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing required query param: id" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    delete body.id;
    delete body.org_id;
    delete body.orgId;
    delete body.created_at;
    delete body.createdAt;

    // Map snake_case keys from frontend to camelCase for Prisma
    const prismaData: Record<string, unknown> = {};
    const keyMap: Record<string, string> = {
      reorder_at: "reorderAt",
      cost_price: "costPrice",
      is_active: "isActive",
    };

    for (const [key, value] of Object.entries(body)) {
      const prismaKey = keyMap[key] || key;
      prismaData[prismaKey] = value;
    }

    const result = await prisma.product.updateMany({
      where: { id, orgId },
      data: prismaData,
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = await prisma.product.findUnique({ where: { id } });

    return NextResponse.json({ product });
  } catch (err) {
    console.error("Update product error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
