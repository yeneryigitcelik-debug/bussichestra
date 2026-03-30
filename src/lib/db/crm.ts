import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// CRM — customers, pipeline, top accounts
// ---------------------------------------------------------------------------

export async function getCustomers(
  orgId: string,
  filters?: {
    stage?: string;
    search?: string;
    limit?: number;
    offset?: number;
  },
) {
  const where: Prisma.CustomerWhereInput = {
    orgId,
    ...(filters?.stage ? { stage: filters.stage } : {}),
    ...(filters?.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        assignedWorker: { select: { id: true, name: true, role: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    customers: customers.map((c) => ({
      ...c,
      lifetimeValue: Number(c.lifetimeValue),
    })),
    total,
  };
}

export async function getCustomer(orgId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, orgId },
    include: {
      assignedWorker: { select: { id: true, name: true, role: true } },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          dueDate: true,
          createdAt: true,
        },
      },
      projects: {
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, name: true, status: true },
      },
    },
  });

  if (!customer) return null;

  return {
    ...customer,
    lifetimeValue: Number(customer.lifetimeValue),
    invoices: customer.invoices.map((inv) => ({
      ...inv,
      total: Number(inv.total),
    })),
  };
}

export async function createCustomer(
  orgId: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    stage?: string;
    notes?: string;
    address?: string;
    city?: string;
    country?: string;
    website?: string;
    source?: string;
    assignedWorkerId?: string;
    lifetimeValue?: number;
    tags?: string[];
  },
) {
  return prisma.customer.create({
    data: {
      orgId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      stage: data.stage ?? "lead",
      notes: data.notes,
      address: data.address,
      city: data.city,
      country: data.country,
      website: data.website,
      source: data.source ?? "manual",
      assignedWorkerId: data.assignedWorkerId,
      lifetimeValue: data.lifetimeValue
        ? new Prisma.Decimal(data.lifetimeValue)
        : undefined,
      tags: data.tags ?? [],
    },
  });
}

export async function updateCustomer(
  orgId: string,
  customerId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    stage?: string;
    notes?: string;
    address?: string;
    city?: string;
    country?: string;
    website?: string;
    source?: string;
    assignedWorkerId?: string;
    lifetimeValue?: number;
    lastContactAt?: Date;
    tags?: string[];
  },
) {
  const updateData: Prisma.CustomerUpdateInput = { ...data };

  // Convert lifetimeValue to Decimal if provided
  if (data.lifetimeValue !== undefined) {
    updateData.lifetimeValue = new Prisma.Decimal(data.lifetimeValue);
  }

  await prisma.customer.updateMany({
    where: { id: customerId, orgId },
    data: updateData as Prisma.CustomerUpdateManyMutationInput,
  });

  return prisma.customer.findFirst({ where: { id: customerId, orgId } });
}

// ── Pipeline summary ────────────────────────────────────────────────────────

export async function getPipelineSummary(orgId: string) {
  const groups = await prisma.customer.groupBy({
    by: ["stage"],
    where: { orgId },
    _count: true,
    _sum: { lifetimeValue: true },
  });

  const pipeline = groups.map((g) => ({
    stage: g.stage,
    count: g._count,
    totalValue: Number(g._sum.lifetimeValue ?? 0),
  }));

  const totalCustomers = pipeline.reduce((sum, g) => sum + g.count, 0);
  const totalValue = pipeline.reduce((sum, g) => sum + g.totalValue, 0);

  return { stages: pipeline, totalCustomers, totalValue };
}

// ── Top customers by lifetime value ─────────────────────────────────────────

export async function getTopCustomers(orgId: string, limit: number = 10) {
  const customers = await prisma.customer.findMany({
    where: { orgId },
    orderBy: { lifetimeValue: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      stage: true,
      lifetimeValue: true,
      lastContactAt: true,
    },
  });

  return customers.map((c) => ({
    ...c,
    lifetimeValue: Number(c.lifetimeValue),
  }));
}
