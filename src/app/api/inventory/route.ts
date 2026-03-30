import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    // Fetch all products for the org
    const products = await prisma.product.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });

    const totalProducts = products.length;

    // Calculate total stock value (quantity * price)
    const totalStockValue = products.reduce((sum, p) => {
      return sum + (p.quantity ?? 0) * Number(p.price ?? 0);
    }, 0);

    // Low stock alerts: products where quantity <= reorderAt AND reorderAt > 0
    const lowStockAlerts = products.filter(
      (p) => p.reorderAt > 0 && p.quantity <= p.reorderAt
    );

    return NextResponse.json({
      products,
      total_products: totalProducts,
      total_stock_value: totalStockValue,
      low_stock_alerts: lowStockAlerts,
    });
  } catch (err) {
    console.error("Inventory overview error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
