import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customer_id");
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const where: Prisma.InvoiceWhereInput = { orgId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const invoices = await prisma.invoice.findMany({
      where,
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    return NextResponse.json({ invoices });
  } catch (err) {
    console.error("Invoices GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export async function POST(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const body = await request.json();

    const { customer_id, due_date } = body;
    if (!customer_id || !due_date) {
      return NextResponse.json(
        { error: "Missing required fields: customer_id, due_date" },
        { status: 400 }
      );
    }

    const items: InvoiceItem[] = body.items ?? [];
    const taxRate = body.tax_rate ?? 0;
    const currency = body.currency ?? "USD";

    // Calculate subtotal from items
    const subtotal = items.reduce(
      (sum, item) => sum + (item.quantity ?? 0) * (item.unit_price ?? 0),
      0
    );
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Generate invoice number: INV-YYYYMMDD-XXXX
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoiceNumber = `INV-${datePart}-${randomPart}`;

    const invoice = await prisma.invoice.create({
      data: {
        orgId,
        customerId: customer_id,
        invoiceNumber,
        type: "invoice",
        status: "draft",
        currency,
        subtotal,
        taxRate,
        taxAmount,
        discountAmount: 0,
        total,
        notes: body.notes ?? null,
        dueDate: new Date(due_date),
      },
    });

    // Insert invoice items if provided
    if (items.length > 0) {
      try {
        await prisma.invoiceItem.createMany({
          data: items.map((item, index) => ({
            invoiceId: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            taxRate,
            total: (item.quantity ?? 0) * (item.unit_price ?? 0),
            sortOrder: index,
          })),
        });
      } catch (itemsError) {
        console.error("Invoice items insert error:", itemsError);
        // Invoice was created but items failed - return partial success
        return NextResponse.json(
          {
            invoice,
            warning: "Invoice created but some items failed to save",
          },
          { status: 201 }
        );
      }
    }

    // Return the invoice with items
    const fullInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        items: true,
        customer: { select: { name: true } },
      },
    });

    return NextResponse.json(
      { invoice: fullInvoice ?? invoice },
      { status: 201 }
    );
  } catch (err) {
    console.error("Invoices POST error:", err);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
