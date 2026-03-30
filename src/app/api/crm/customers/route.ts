import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const stage = searchParams.get("stage");
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const where: Prisma.CustomerWhereInput = { orgId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (stage) {
      where.stage = stage;
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    return NextResponse.json({ customers });
  } catch (err) {
    console.error("Customers GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const body = await request.json();

    const { name } = body;
    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        orgId,
        name,
        email: body.email ?? null,
        phone: body.phone ?? null,
        company: body.company ?? null,
        stage: body.stage ?? "lead",
        notes: body.notes ?? null,
        source: body.source ?? "manual",
        website: body.website ?? null,
        lifetimeValue: 0,
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    console.error("Customers POST error:", err);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const body = await request.json();

    const { id, ...updateFields } = body;
    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 }
      );
    }

    // Remove fields that should not be updated directly
    delete updateFields.org_id;
    delete updateFields.orgId;
    delete updateFields.created_at;
    delete updateFields.createdAt;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Map snake_case keys from frontend to camelCase for Prisma
    const prismaData: Record<string, unknown> = {};
    const keyMap: Record<string, string> = {
      lifetime_value: "lifetimeValue",
      last_contact_at: "lastContactAt",
      assigned_worker_id: "assignedWorkerId",
    };

    for (const [key, value] of Object.entries(updateFields)) {
      const prismaKey = keyMap[key] || key;
      prismaData[prismaKey] = value;
    }

    const customer = await prisma.customer.updateMany({
      where: { id, orgId },
      data: prismaData,
    });

    if (customer.count === 0) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.customer.findUnique({ where: { id } });

    return NextResponse.json({ customer: updated });
  } catch (err) {
    console.error("Customers PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}
