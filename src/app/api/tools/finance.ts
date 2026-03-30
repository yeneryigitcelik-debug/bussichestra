import { prisma } from "@/lib/prisma";

export async function handleFinanceTool(
  toolName: string,
  input: Record<string, unknown>,
  orgId: string,
): Promise<string> {
  switch (toolName) {
    case "get_revenue_summary": {
      const { start_date, end_date } = input as { start_date: string; end_date: string };

      const data = await prisma.transaction.findMany({
        where: {
          orgId,
          type: "income",
          date: { gte: new Date(start_date), lte: new Date(end_date) },
        },
        select: { category: true, amount: true },
      });

      const total = data.reduce((sum, t) => sum + Number(t.amount), 0);
      const byCategory: Record<string, number> = {};
      data.forEach((t) => {
        const cat = t.category || "Uncategorized";
        byCategory[cat] = (byCategory[cat] || 0) + Number(t.amount);
      });

      return JSON.stringify({ total, transaction_count: data.length, by_category: byCategory, period: { start_date, end_date } });
    }

    case "get_expense_summary": {
      const { start_date, end_date, category } = input as { start_date: string; end_date: string; category?: string };

      const where: Record<string, unknown> = {
        orgId,
        type: "expense",
        date: { gte: new Date(start_date), lte: new Date(end_date) },
      };
      if (category) where.category = category;

      const data = await prisma.transaction.findMany({
        where,
        select: { category: true, amount: true },
      });

      const total = data.reduce((sum, t) => sum + Number(t.amount), 0);
      const byCategory: Record<string, number> = {};
      data.forEach((t) => {
        const cat = t.category || "Uncategorized";
        byCategory[cat] = (byCategory[cat] || 0) + Number(t.amount);
      });

      return JSON.stringify({ total, transaction_count: data.length, by_category: byCategory });
    }

    case "get_profit_loss": {
      const { start_date, end_date } = input as { start_date: string; end_date: string };

      const data = await prisma.transaction.findMany({
        where: {
          orgId,
          date: { gte: new Date(start_date), lte: new Date(end_date) },
        },
        select: { type: true, category: true, amount: true },
      });

      let totalRevenue = 0, totalExpenses = 0;
      const revenueByCategory: Record<string, number> = {};
      const expenseByCategory: Record<string, number> = {};

      data.forEach((t) => {
        const cat = t.category || "Uncategorized";
        if (t.type === "income") {
          totalRevenue += Number(t.amount);
          revenueByCategory[cat] = (revenueByCategory[cat] || 0) + Number(t.amount);
        } else {
          totalExpenses += Number(t.amount);
          expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Number(t.amount);
        }
      });

      return JSON.stringify({
        revenue: { total: totalRevenue, by_category: revenueByCategory },
        expenses: { total: totalExpenses, by_category: expenseByCategory },
        net_profit: totalRevenue - totalExpenses,
        margin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(1) + "%" : "N/A",
      });
    }

    case "create_invoice": {
      const { customer_id, items, due_date, notes, tax_rate } = input as {
        customer_id: string;
        items: { description: string; quantity: number; unit_price: number }[];
        due_date?: string;
        notes?: string;
        tax_rate?: number;
      };

      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      const taxAmt = subtotal * ((tax_rate || 0) / 100);
      const total = subtotal + taxAmt;

      // Generate invoice number
      const count = await prisma.invoice.count({ where: { orgId } });
      const invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`;

      const invoice = await prisma.invoice.create({
        data: {
          orgId,
          customerId: customer_id,
          invoiceNumber,
          subtotal,
          taxRate: tax_rate || 0,
          taxAmount: taxAmt,
          total,
          dueDate: due_date ? new Date(due_date) : null,
          notes: notes || null,
        },
      });

      // Insert line items
      await prisma.invoiceItem.createMany({
        data: items.map((item, i) => ({
          invoiceId: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          total: item.quantity * item.unit_price,
          sortOrder: i,
        })),
      });

      return JSON.stringify({ invoice_number: invoiceNumber, total, status: "draft", id: invoice.id });
    }

    case "list_invoices": {
      const { status, customer_id, limit } = input as { status?: string; customer_id?: string; limit?: number };

      const where: Record<string, unknown> = { orgId };
      if (status) where.status = status;
      if (customer_id) where.customerId = customer_id;

      const data = await prisma.invoice.findMany({
        where,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          currency: true,
          dueDate: true,
          createdAt: true,
          customer: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit || 20,
      });

      const invoices = data.map((inv) => ({
        id: inv.id,
        invoice_number: inv.invoiceNumber,
        status: inv.status,
        total: Number(inv.total),
        currency: inv.currency,
        due_date: inv.dueDate,
        created_at: inv.createdAt,
        customers: inv.customer ? { name: inv.customer.name } : null,
      }));

      return JSON.stringify({ invoices, count: invoices.length });
    }

    case "record_transaction": {
      const { type, amount, category, description, customer_id, date } = input as {
        type: string; amount: number; category: string; description?: string; customer_id?: string; date?: string;
      };

      const data = await prisma.transaction.create({
        data: {
          orgId,
          type,
          amount,
          category,
          description: description || null,
          customerId: customer_id || null,
          date: date ? new Date(date) : new Date(),
        },
      });

      return JSON.stringify({ transaction_id: data.id, type, amount, category, status: "recorded" });
    }

    case "get_cash_flow": {
      const { start_date, end_date } = input as { start_date: string; end_date: string };

      const data = await prisma.transaction.findMany({
        where: {
          orgId,
          date: { gte: new Date(start_date), lte: new Date(end_date) },
        },
        select: { type: true, amount: true, date: true },
        orderBy: { date: "asc" },
      });

      let runningBalance = 0;
      const cashFlow = data.map((t) => {
        const amt = t.type === "income" ? Number(t.amount) : -Number(t.amount);
        runningBalance += amt;
        return { date: t.date, type: t.type, amount: Number(t.amount), running_balance: runningBalance };
      });

      const totalIn = data.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const totalOut = data.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

      return JSON.stringify({ total_inflow: totalIn, total_outflow: totalOut, net_flow: totalIn - totalOut, entries: cashFlow });
    }

    default:
      return JSON.stringify({ error: `Unknown finance tool: ${toolName}` });
  }
}
