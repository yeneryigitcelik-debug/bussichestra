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
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const where: Prisma.TransactionWhereInput = { orgId };
    if (type) where.type = type;
    if (category) where.category = category;

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: offset,
      take: limit,
    });

    return NextResponse.json({ transactions });
  } catch (err) {
    console.error("Transactions GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const body = await request.json();

    const { type, category, amount, description, date } = body;
    if (!type || !category || amount == null || !description || !date) {
      return NextResponse.json(
        { error: "Missing required fields: type, category, amount, description, date" },
        { status: 400 }
      );
    }

    if (!["income", "expense"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'income' or 'expense'" },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        orgId,
        type,
        category,
        amount,
        description,
        date: new Date(date),
        customerId: body.customer_id ?? null,
        paymentMethod: body.payment_method ?? null,
        referenceNumber: body.reference_number ?? null,
        currency: body.currency ?? "USD",
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (err) {
    console.error("Transactions POST error:", err);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
