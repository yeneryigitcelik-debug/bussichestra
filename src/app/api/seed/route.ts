import { getAuthenticatedContext } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { error, prisma, orgId, userId } = await getAuthenticatedContext();
  if (error) return error;

  try {
    // Check if org already has data — abort if customers exist
    const existingCount = await prisma.customer.count({
      where: { orgId },
    });

    if (existingCount > 0) {
      return NextResponse.json({ error: "Organization already has data. Seed is only available for empty organizations." }, { status: 409 });
    }

    // --- Helper: date offsets ---
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
    const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000);

    // --- 1. Customers ---
    const customersData = [
      { name: "Acme Corporation", email: "contact@acme.com", company: "Acme Corp", stage: "customer", lifetimeValue: 125000, source: "referral", website: "https://acme.com" },
      { name: "TechStart Ltd", email: "hello@techstart.io", company: "TechStart", stage: "prospect", lifetimeValue: 0, source: "website" },
      { name: "GlobalTech Industries", email: "info@globaltech.com", company: "GlobalTech", stage: "lead", lifetimeValue: 0, source: "linkedin" },
      { name: "InnoSoft Solutions", email: "sales@innosoft.dev", company: "InnoSoft", stage: "customer", lifetimeValue: 78000, source: "conference" },
      { name: "DataFlow Analytics", email: "team@dataflow.ai", company: "DataFlow", stage: "prospect", lifetimeValue: 0, source: "cold_outreach" },
      { name: "CloudNine SaaS", email: "info@cloudnine.io", company: "CloudNine", stage: "customer", lifetimeValue: 45000, source: "partner" },
      { name: "BrightMedia Agency", email: "projects@brightmedia.co", company: "BrightMedia", stage: "lead", lifetimeValue: 0, source: "website" },
      { name: "NexGen Robotics", email: "procurement@nexgen.tech", company: "NexGen", stage: "prospect", lifetimeValue: 0, source: "trade_show" },
      { name: "Alpine Consulting", email: "hello@alpine.consulting", company: "Alpine", stage: "churned", lifetimeValue: 32000, source: "referral" },
      { name: "Velocity Commerce", email: "ops@velocity.shop", company: "Velocity", stage: "customer", lifetimeValue: 95000, source: "website" },
    ];

    const customers = [];
    for (const c of customersData) {
      const customer = await prisma.customer.create({
        data: { ...c, orgId },
        select: { id: true, name: true },
      });
      customers.push(customer);
    }

    // Build a lookup for customer IDs by name
    const customerMap = new Map<string, string>();
    customers.forEach((c) => customerMap.set(c.name, c.id));

    // --- 2. Products ---
    const productsData = [
      { name: "Premium Plan", sku: "PLAN-PRE", category: "Subscription", quantity: 999, price: 99, costPrice: 15, reorderAt: 0, unit: "license" },
      { name: "Enterprise Plan", sku: "PLAN-ENT", category: "Subscription", quantity: 999, price: 299, costPrice: 45, reorderAt: 0, unit: "license" },
      { name: "API Credits Pack (1000)", sku: "API-1000", category: "Add-on", quantity: 45, price: 49, costPrice: 8, reorderAt: 10, unit: "pack" },
      { name: "Support Hours (10h)", sku: "SUP-10H", category: "Service", quantity: 23, price: 500, costPrice: 200, reorderAt: 5, unit: "pack" },
      { name: "Custom Integration", sku: "INT-CUST", category: "Service", quantity: 15, price: 2500, costPrice: 800, reorderAt: 3, unit: "unit" },
      { name: "Data Migration Service", sku: "MIG-DATA", category: "Service", quantity: 8, price: 1500, costPrice: 500, reorderAt: 2, unit: "unit" },
      { name: "Training Workshop", sku: "TRN-WRK", category: "Service", quantity: 12, price: 800, costPrice: 300, reorderAt: 3, unit: "session" },
      { name: "Starter Plan", sku: "PLAN-STR", category: "Subscription", quantity: 999, price: 29, costPrice: 5, reorderAt: 0, unit: "license" },
    ];

    const products = [];
    for (const p of productsData) {
      const product = await prisma.product.create({
        data: { ...p, orgId },
        select: { id: true },
      });
      products.push(product);
    }

    // --- 3. Transactions (20) ---
    const incomeCategories = ["Software License", "Consulting", "Support Contract", "Training"];
    const expenseCategories = ["Salaries", "Cloud Services", "Marketing", "Office Supplies", "Software Tools"];

    const transactionsToCreate: Array<{
      orgId: string;
      type: string;
      category: string;
      amount: number;
      description: string;
      date: Date;
    }> = [];

    // 12 income transactions
    for (let i = 0; i < 12; i++) {
      const category = incomeCategories[i % incomeCategories.length];
      const amount = Math.round((1000 + Math.random() * 24000) * 100) / 100;
      transactionsToCreate.push({
        orgId,
        type: "income",
        category,
        amount,
        description: `${category} revenue - ${["Q1", "Q2", "Monthly", "Annual"][i % 4]} payment`,
        date: daysAgo(Math.floor(Math.random() * 90)),
      });
    }

    // 8 expense transactions
    for (let i = 0; i < 8; i++) {
      const category = expenseCategories[i % expenseCategories.length];
      const amount = Math.round((500 + Math.random() * 11500) * 100) / 100;
      transactionsToCreate.push({
        orgId,
        type: "expense",
        category,
        amount,
        description: `${category} - ${["January", "February", "March", "Quarterly"][i % 4]} payment`,
        date: daysAgo(Math.floor(Math.random() * 90)),
      });
    }

    let txnCount = 0;
    for (const txn of transactionsToCreate) {
      await prisma.transaction.create({ data: txn });
      txnCount++;
    }

    // --- 4. Invoices (5) ---
    const invoiceCustomerNames = [
      "Acme Corporation",
      "InnoSoft Solutions",
      "CloudNine SaaS",
      "NexGen Robotics",
      "Velocity Commerce",
    ];

    const invoicesRaw = [
      { invoiceNumber: "INV-2026-001", status: "paid", total: 25000, taxRate: 18, dueDate: daysAgo(30), paidAt: daysAgo(25) },
      { invoiceNumber: "INV-2026-002", status: "sent", total: 12500, taxRate: 18, dueDate: daysFromNow(14), paidAt: null },
      { invoiceNumber: "INV-2026-003", status: "draft", total: 8500, taxRate: 18, dueDate: daysFromNow(30), paidAt: null },
      { invoiceNumber: "INV-2026-004", status: "overdue", total: 5400, taxRate: 18, dueDate: daysAgo(14), paidAt: null },
      { invoiceNumber: "INV-2026-005", status: "paid", total: 18000, taxRate: 18, dueDate: daysAgo(45), paidAt: daysAgo(40) },
    ];

    const invoices = [];
    for (let i = 0; i < invoicesRaw.length; i++) {
      const inv = invoicesRaw[i];
      const taxAmount = Math.round((inv.total * inv.taxRate) / (100 + inv.taxRate) * 100) / 100;
      const subtotal = Math.round((inv.total - taxAmount) * 100) / 100;

      const invoice = await prisma.invoice.create({
        data: {
          orgId,
          customerId: customerMap.get(invoiceCustomerNames[i]) ?? null,
          invoiceNumber: inv.invoiceNumber,
          status: inv.status,
          subtotal,
          taxRate: inv.taxRate,
          taxAmount,
          total: inv.total,
          dueDate: inv.dueDate,
          paidAt: inv.paidAt,
        },
        select: { id: true },
      });
      invoices.push(invoice);
    }

    // --- 5. Projects (3) ---
    const projectsData = [
      { orgId, name: "Website Redesign", status: "active", priority: "high", startDate: daysAgo(60), dueDate: daysFromNow(30) },
      { orgId, name: "Mobile App v2.0", status: "planning", priority: "medium", startDate: null, dueDate: daysFromNow(90) },
      { orgId, name: "API Integration Hub", status: "active", priority: "high", startDate: daysAgo(30), dueDate: daysFromNow(60) },
    ];

    const projects = [];
    for (const p of projectsData) {
      const project = await prisma.project.create({
        data: p,
        select: { id: true, name: true },
      });
      projects.push(project);
    }

    // Build project lookup
    const projectMap = new Map<string, string>();
    projects.forEach((p) => projectMap.set(p.name, p.id));

    // --- 6. Project Tasks (12, 4 per project) ---
    const tasksData = [
      // Website Redesign
      { orgId, projectId: projectMap.get("Website Redesign")!, title: "Design new homepage mockups", status: "done", priority: "high", dueDate: daysAgo(15) },
      { orgId, projectId: projectMap.get("Website Redesign")!, title: "Implement responsive navigation", status: "review", priority: "high", dueDate: daysFromNow(5) },
      { orgId, projectId: projectMap.get("Website Redesign")!, title: "Migrate blog to new CMS", status: "in_progress", priority: "medium", dueDate: daysFromNow(15) },
      { orgId, projectId: projectMap.get("Website Redesign")!, title: "SEO audit and optimization", status: "todo", priority: "low", dueDate: daysFromNow(25) },
      // Mobile App v2.0
      { orgId, projectId: projectMap.get("Mobile App v2.0")!, title: "Define feature requirements", status: "done", priority: "high", dueDate: daysAgo(5) },
      { orgId, projectId: projectMap.get("Mobile App v2.0")!, title: "Create wireframes for new flows", status: "in_progress", priority: "high", dueDate: daysFromNow(10) },
      { orgId, projectId: projectMap.get("Mobile App v2.0")!, title: "Set up CI/CD pipeline", status: "todo", priority: "medium", dueDate: daysFromNow(30) },
      { orgId, projectId: projectMap.get("Mobile App v2.0")!, title: "Plan push notification system", status: "todo", priority: "low", dueDate: daysFromNow(60) },
      // API Integration Hub
      { orgId, projectId: projectMap.get("API Integration Hub")!, title: "Design REST API schema", status: "done", priority: "high", dueDate: daysAgo(10) },
      { orgId, projectId: projectMap.get("API Integration Hub")!, title: "Build authentication middleware", status: "review", priority: "high", dueDate: daysFromNow(3) },
      { orgId, projectId: projectMap.get("API Integration Hub")!, title: "Implement rate limiting", status: "in_progress", priority: "medium", dueDate: daysFromNow(20) },
      { orgId, projectId: projectMap.get("API Integration Hub")!, title: "Write integration test suite", status: "todo", priority: "medium", dueDate: daysFromNow(40) },
    ];

    let taskCount = 0;
    for (const t of tasksData) {
      await prisma.projectTask.create({ data: t });
      taskCount++;
    }

    // --- 7. Notifications (5) ---
    const notificationsData = [
      { orgId, userId, title: "Invoice Paid", body: "Acme Corporation paid INV-2026-001 ($25,000)", type: "success" },
      { orgId, userId, title: "Overdue Invoice", body: "INV-2026-004 for NexGen Robotics is 14 days overdue ($5,400)", type: "warning" },
      { orgId, userId, title: "New Lead", body: "GlobalTech Industries was added as a new lead from LinkedIn", type: "info", isRead: true },
      { orgId, userId, title: "Low Stock Alert", body: "Data Migration Service inventory is below reorder threshold (8 remaining)", type: "warning" },
      { orgId, userId, title: "Task Completed", body: "Design new homepage mockups has been marked as done", type: "success", isRead: true },
    ];

    for (const n of notificationsData) {
      await prisma.notification.create({ data: n });
    }

    // --- 8. Activity Logs (10) ---
    const activityLogsData = [
      { orgId, actorType: "user", actorId: userId, actorName: "User", action: "created", entityType: "customer", entityName: "Added new customer: Acme Corporation" },
      { orgId, actorType: "user", actorId: userId, actorName: "User", action: "created", entityType: "invoice", entityName: "Created invoice INV-2026-001 for $25,000" },
      { orgId, actorType: "user", actorId: userId, actorName: "User", action: "updated", entityType: "invoice", entityName: "Invoice INV-2026-001 was marked as paid" },
      { orgId, actorType: "user", actorId: userId, actorName: "User", action: "created", entityType: "project", entityName: "Created project: Website Redesign" },
      { orgId, actorType: "user", actorId: userId, actorName: "User", action: "completed", entityType: "task", entityName: "Completed task: Design new homepage mockups" },
      { orgId, actorType: "user", actorId: userId, actorName: "User", action: "updated", entityType: "product", entityName: "Updated inventory for API Credits Pack (1000)" },
      { orgId, actorType: "user", actorId: userId, actorName: "User", action: "updated", entityType: "customer", entityName: "Updated Alpine Consulting stage to churned" },
      { orgId, actorType: "user", actorId: userId, actorName: "User", action: "sent", entityType: "email", entityName: "Sent partnership proposal to GlobalTech Industries" },
      { orgId, actorType: "user", actorId: userId, actorName: "User", action: "sent", entityType: "invoice", entityName: "Sent invoice INV-2026-002 to InnoSoft Solutions ($12,500)" },
      { orgId, actorType: "user", actorId: userId, actorName: "User", action: "completed", entityType: "worker", entityName: "Chat session with Ayse (CFO) about Q1 financials" },
    ];

    for (const a of activityLogsData) {
      await prisma.activityLog.create({ data: a });
    }

    // --- Return summary ---
    return NextResponse.json({
      success: true,
      counts: {
        customers: customers.length,
        products: products.length,
        transactions: txnCount,
        invoices: invoices.length,
        projects: projects.length,
        tasks: taskCount,
        emails: 0,
      },
    });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json(
      { error: "Unexpected error during seeding", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
