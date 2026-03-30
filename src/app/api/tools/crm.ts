import { prisma } from "@/lib/prisma";

export async function handleCrmTool(
  toolName: string,
  input: Record<string, unknown>,
  orgId: string,
): Promise<string> {
  switch (toolName) {
    case "list_customers": {
      const { stage, search, limit } = input as { stage?: string; search?: string; limit?: number };

      const where: Record<string, unknown> = { orgId };
      if (stage) where.stage = stage;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
        ];
      }

      const data = await prisma.customer.findMany({
        where,
        select: {
          id: true, name: true, email: true, company: true, stage: true,
          phone: true, lifetimeValue: true, lastContactAt: true, tags: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit || 20,
      });

      const customers = data.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        company: c.company,
        stage: c.stage,
        phone: c.phone,
        lifetime_value: Number(c.lifetimeValue),
        last_contact_at: c.lastContactAt,
        tags: c.tags,
        created_at: c.createdAt,
      }));

      return JSON.stringify({ customers, count: customers.length });
    }

    case "get_customer": {
      const { customer_id } = input as { customer_id: string };

      const data = await prisma.customer.findUnique({ where: { id: customer_id } });
      if (!data) return JSON.stringify({ error: "Customer not found" });

      // Get related transactions
      const transactions = await prisma.transaction.findMany({
        where: { customerId: customer_id },
        select: { type: true, amount: true, category: true, date: true },
        orderBy: { date: "desc" },
        take: 10,
      });

      // Get related invoices
      const invoices = await prisma.invoice.findMany({
        where: { customerId: customer_id },
        select: { invoiceNumber: true, status: true, total: true, dueDate: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      return JSON.stringify({
        customer: data,
        recent_transactions: transactions.map((t) => ({
          type: t.type, amount: Number(t.amount), category: t.category, date: t.date,
        })),
        recent_invoices: invoices.map((inv) => ({
          invoice_number: inv.invoiceNumber, status: inv.status,
          total: Number(inv.total), due_date: inv.dueDate,
        })),
      });
    }

    case "create_customer": {
      const { name, email, phone, company, source, notes } = input as {
        name: string; email?: string; phone?: string; company?: string; source?: string; notes?: string;
      };

      const data = await prisma.customer.create({
        data: {
          orgId,
          name,
          email: email || null,
          phone: phone || null,
          company: company || null,
          source: source || "manual",
          notes: notes || null,
          stage: "lead",
        },
      });

      return JSON.stringify({ customer_id: data.id, name, stage: "lead", status: "created" });
    }

    case "update_customer_stage": {
      const { customer_id, stage, notes } = input as { customer_id: string; stage: string; notes?: string };

      const updates: Record<string, unknown> = { stage };
      if (notes) {
        const existing = await prisma.customer.findUnique({
          where: { id: customer_id },
          select: { notes: true },
        });
        const existingNotes = existing?.notes || "";
        updates.notes = `${existingNotes}\n[${new Date().toISOString().split("T")[0]}] Stage -> ${stage}: ${notes}`.trim();
      }

      await prisma.customer.update({ where: { id: customer_id }, data: updates });
      return JSON.stringify({ customer_id, new_stage: stage, status: "updated" });
    }

    case "get_pipeline_summary": {
      const data = await prisma.customer.findMany({
        where: { orgId },
        select: { stage: true, lifetimeValue: true },
      });

      const pipeline: Record<string, { count: number; total_value: number }> = {};
      data.forEach((c) => {
        if (!pipeline[c.stage]) pipeline[c.stage] = { count: 0, total_value: 0 };
        pipeline[c.stage].count++;
        pipeline[c.stage].total_value += Number(c.lifetimeValue) || 0;
      });

      return JSON.stringify({ pipeline, total_customers: data.length });
    }

    case "log_customer_interaction": {
      const { customer_id, type, content } = input as { customer_id: string; type: string; content: string };

      const existing = await prisma.customer.findUnique({
        where: { id: customer_id },
        select: { notes: true },
      });
      const existingNotes = existing?.notes || "";
      const newNote = `[${new Date().toISOString().split("T")[0]} ${type}] ${content}`;

      await prisma.customer.update({
        where: { id: customer_id },
        data: {
          notes: `${existingNotes}\n${newNote}`.trim(),
          lastContactAt: new Date(),
        },
      });

      return JSON.stringify({ status: "logged", type, customer_id });
    }

    case "get_sales_forecast": {
      const data = await prisma.customer.findMany({
        where: { orgId },
        select: { stage: true, lifetimeValue: true, createdAt: true },
      });

      const stages = { lead: 0.1, prospect: 0.3, customer: 1.0, churned: 0 };
      const totalPipeline = data.reduce((sum, c) => {
        const rate = stages[c.stage as keyof typeof stages] ?? 0;
        return sum + (Number(c.lifetimeValue) || 0) * rate;
      }, 0);

      const customerCount = data.filter((c) => c.stage === "customer").length;
      const avgDealSize = customerCount > 0
        ? data.filter((c) => c.stage === "customer").reduce((s, c) => s + (Number(c.lifetimeValue) || 0), 0) / customerCount
        : 0;

      return JSON.stringify({
        weighted_pipeline_value: totalPipeline,
        total_leads: data.filter((c) => c.stage === "lead").length,
        total_prospects: data.filter((c) => c.stage === "prospect").length,
        total_customers: customerCount,
        average_deal_size: avgDealSize,
      });
    }

    default:
      return JSON.stringify({ error: `Unknown CRM tool: ${toolName}` });
  }
}
