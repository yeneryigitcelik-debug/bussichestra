import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Inventory — products, alerts, valuation
// ---------------------------------------------------------------------------

export async function getProducts(
  orgId: string,
  filters?: {
    category?: string;
    search?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  },
) {
  const where: Prisma.ProductWhereInput = {
    orgId,
    ...(filters?.category ? { category: filters.category } : {}),
    ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
    ...(filters?.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { sku: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products.map((p) => ({
      ...p,
      price: p.price ? Number(p.price) : null,
      costPrice: p.costPrice ? Number(p.costPrice) : null,
    })),
    total,
  };
}

export async function getProduct(orgId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, orgId },
  });

  if (!product) return null;

  return {
    ...product,
    price: product.price ? Number(product.price) : null,
    costPrice: product.costPrice ? Number(product.costPrice) : null,
  };
}

export async function createProduct(
  orgId: string,
  data: {
    name: string;
    sku?: string;
    description?: string;
    category?: string;
    quantity?: number;
    reorderAt?: number;
    price?: number;
    costPrice?: number;
    unit?: string;
    supplier?: string;
    barcode?: string;
    location?: string;
    isActive?: boolean;
  },
) {
  return prisma.product.create({
    data: {
      orgId,
      name: data.name,
      sku: data.sku,
      description: data.description,
      category: data.category,
      quantity: data.quantity ?? 0,
      reorderAt: data.reorderAt ?? 10,
      price: data.price !== undefined ? new Prisma.Decimal(data.price) : undefined,
      costPrice: data.costPrice !== undefined ? new Prisma.Decimal(data.costPrice) : undefined,
      unit: data.unit ?? "piece",
      supplier: data.supplier,
      barcode: data.barcode,
      location: data.location,
      isActive: data.isActive ?? true,
    },
  });
}

export async function updateProduct(
  orgId: string,
  productId: string,
  data: {
    name?: string;
    sku?: string;
    description?: string;
    category?: string;
    quantity?: number;
    reorderAt?: number;
    price?: number;
    costPrice?: number;
    unit?: string;
    supplier?: string;
    barcode?: string;
    location?: string;
    isActive?: boolean;
  },
) {
  const updateData: Record<string, unknown> = { ...data };

  if (data.price !== undefined) {
    updateData.price = new Prisma.Decimal(data.price);
  }
  if (data.costPrice !== undefined) {
    updateData.costPrice = new Prisma.Decimal(data.costPrice);
  }

  await prisma.product.updateMany({
    where: { id: productId, orgId },
    data: updateData as Prisma.ProductUpdateManyMutationInput,
  });

  return getProduct(orgId, productId);
}

// ── Inventory alerts (low stock) ────────────────────────────────────────────

export async function getInventoryAlerts(orgId: string) {
  const products = await prisma.product.findMany({
    where: {
      orgId,
      isActive: true,
      reorderAt: { gt: 0 },
    },
    orderBy: { quantity: "asc" },
  });

  // Filter in application code because Prisma doesn't support column-to-column comparison in where
  const lowStock = products.filter((p) => p.quantity <= p.reorderAt);

  return lowStock.map((p) => ({
    ...p,
    price: p.price ? Number(p.price) : null,
    costPrice: p.costPrice ? Number(p.costPrice) : null,
    deficit: p.reorderAt - p.quantity,
  }));
}

// ── Inventory valuation ─────────────────────────────────────────────────────

export async function getInventoryValuation(orgId: string) {
  const products = await prisma.product.findMany({
    where: { orgId, isActive: true },
    select: { quantity: true, price: true, costPrice: true },
  });

  let totalRetailValue = 0;
  let totalCostValue = 0;

  for (const p of products) {
    const price = p.price ? Number(p.price) : 0;
    const cost = p.costPrice ? Number(p.costPrice) : 0;
    totalRetailValue += price * p.quantity;
    totalCostValue += cost * p.quantity;
  }

  return {
    totalRetailValue,
    totalCostValue,
    potentialMargin: totalRetailValue - totalCostValue,
    marginPercent:
      totalRetailValue > 0
        ? ((totalRetailValue - totalCostValue) / totalRetailValue) * 100
        : 0,
    productCount: products.length,
  };
}

// ── Combined inventory summary ──────────────────────────────────────────────

export async function getInventorySummary(orgId: string) {
  const [valuation, alerts, categoryGroups] = await Promise.all([
    getInventoryValuation(orgId),
    getInventoryAlerts(orgId),
    prisma.product.groupBy({
      by: ["category"],
      where: { orgId, isActive: true },
      _count: true,
      _sum: { quantity: true },
    }),
  ]);

  const categories = categoryGroups.map((g) => ({
    category: g.category ?? "uncategorized",
    productCount: g._count,
    totalQuantity: g._sum.quantity ?? 0,
  }));

  return {
    ...valuation,
    lowStockCount: alerts.length,
    lowStockItems: alerts.slice(0, 5), // top 5 most critical
    categories,
  };
}
