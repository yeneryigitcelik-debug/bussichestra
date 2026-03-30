import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { error, prisma, orgId } = await getAuthenticatedContext();
    if (error) return error;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [customers, newLeadsCount] = await Promise.all([
      // All customers for pipeline and totals
      prisma.customer.findMany({
        where: { orgId },
        select: { id: true, stage: true, lifetimeValue: true },
      }),

      // New leads this month
      prisma.customer.count({
        where: {
          orgId,
          stage: "lead",
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    // Group by pipeline stage
    const pipelineMap: Record<string, { count: number; total_value: number }> = {};
    for (const customer of customers) {
      const stage = customer.stage ?? "unknown";
      if (!pipelineMap[stage]) {
        pipelineMap[stage] = { count: 0, total_value: 0 };
      }
      pipelineMap[stage].count += 1;
      pipelineMap[stage].total_value += Number(customer.lifetimeValue ?? 0);
    }

    const pipeline = Object.entries(pipelineMap).map(([stage, data]) => ({
      stage,
      count: data.count,
      total_value: data.total_value,
    }));

    // Top 5 customers by lifetime value
    const topCustomers = await prisma.customer.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        stage: true,
        lifetimeValue: true,
      },
      orderBy: { lifetimeValue: "desc" },
      take: 5,
    });

    return NextResponse.json({
      pipeline,
      total_customers: customers.length,
      new_leads_this_month: newLeadsCount,
      top_customers: topCustomers,
    });
  } catch (err) {
    console.error("CRM API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch CRM data" },
      { status: 500 }
    );
  }
}
