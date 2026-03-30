import { prisma } from "@/lib/prisma";

export async function handleInventoryTool(
  toolName: string,
  input: Record<string, unknown>,
  orgId: string,
): Promise<string> {
  switch (toolName) {
    case "list_products": {
      const { category, low_stock, search, limit } = input as {
        category?: string; low_stock?: boolean; search?: string; limit?: number;
      };

      const where: Record<string, unknown> = { orgId };
      if (category) where.category = category;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ];
      }

      const data = await prisma.product.findMany({
        where,
        select: {
          id: true, name: true, sku: true, quantity: true, reorderAt: true,
          price: true, costPrice: true, category: true, unit: true, supplier: true, isActive: true,
        },
        orderBy: { name: "asc" },
        take: limit || 20,
      });

      let products = data.map((p) => ({
        id: p.id, name: p.name, sku: p.sku, quantity: p.quantity,
        reorder_at: p.reorderAt, price: p.price ? Number(p.price) : null,
        cost_price: p.costPrice ? Number(p.costPrice) : null,
        category: p.category, unit: p.unit, supplier: p.supplier, is_active: p.isActive,
      }));

      if (low_stock) {
        products = products.filter((p) => p.quantity <= p.reorder_at);
      }

      return JSON.stringify({ products, count: products.length });
    }

    case "get_product": {
      const { product_id } = input as { product_id: string };

      const data = await prisma.product.findUnique({ where: { id: product_id } });
      if (!data) return JSON.stringify({ error: "Product not found" });

      const isLowStock = data.quantity <= data.reorderAt;
      const margin = data.price && data.costPrice
        ? ((Number(data.price) - Number(data.costPrice)) / Number(data.price) * 100).toFixed(1) + "%"
        : "N/A";

      return JSON.stringify({ product: data, low_stock_alert: isLowStock, margin });
    }

    case "update_stock": {
      const { product_id, adjustment, reason } = input as { product_id: string; adjustment: number; reason: string };

      const product = await prisma.product.findUnique({
        where: { id: product_id },
        select: { quantity: true, name: true, reorderAt: true },
      });

      if (!product) return JSON.stringify({ error: "Product not found" });

      const newQuantity = product.quantity + adjustment;
      if (newQuantity < 0) return JSON.stringify({ error: `Cannot reduce stock below 0. Current: ${product.quantity}` });

      await prisma.product.update({
        where: { id: product_id },
        data: { quantity: newQuantity },
      });

      return JSON.stringify({
        product: product.name,
        previous_quantity: product.quantity,
        adjustment,
        new_quantity: newQuantity,
        reason,
        low_stock_alert: newQuantity <= product.reorderAt,
      });
    }

    case "create_product": {
      const { name, sku, price, cost_price, quantity, reorder_at, category, supplier } = input as {
        name: string; sku?: string; price: number; cost_price?: number; quantity?: number;
        reorder_at?: number; category?: string; supplier?: string;
      };

      const data = await prisma.product.create({
        data: {
          orgId,
          name,
          sku: sku || null,
          price,
          costPrice: cost_price || null,
          quantity: quantity || 0,
          reorderAt: reorder_at || 10,
          category: category || null,
          supplier: supplier || null,
        },
      });

      return JSON.stringify({ product_id: data.id, name, status: "created" });
    }

    case "get_inventory_alerts": {
      const data = await prisma.product.findMany({
        where: { orgId, isActive: true },
        select: { id: true, name: true, sku: true, quantity: true, reorderAt: true, category: true },
      });

      const alerts = data
        .filter((p) => p.quantity <= p.reorderAt)
        .map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          quantity: p.quantity,
          reorder_at: p.reorderAt,
          category: p.category,
          shortage: p.reorderAt - p.quantity,
          severity: p.quantity === 0 ? "critical" : p.quantity <= p.reorderAt / 2 ? "warning" : "low",
        }));

      return JSON.stringify({ alerts, total_alerts: alerts.length });
    }

    case "get_inventory_valuation": {
      const { category } = input as { category?: string };

      const where: Record<string, unknown> = { orgId, isActive: true };
      if (category) where.category = category;

      const data = await prisma.product.findMany({
        where,
        select: { name: true, quantity: true, price: true, costPrice: true, category: true },
      });

      const totalRetailValue = data.reduce((s, p) => s + p.quantity * (Number(p.price) || 0), 0);
      const totalCostValue = data.reduce((s, p) => s + p.quantity * (Number(p.costPrice) || 0), 0);
      const totalItems = data.reduce((s, p) => s + p.quantity, 0);

      return JSON.stringify({
        total_retail_value: totalRetailValue,
        total_cost_value: totalCostValue,
        potential_profit: totalRetailValue - totalCostValue,
        total_products: data.length,
        total_items: totalItems,
      });
    }

    default:
      return JSON.stringify({ error: `Unknown inventory tool: ${toolName}` });
  }
}
