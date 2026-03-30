import type { ToolDefinition } from "@/types/ai";

// ============================================================
// Finance Department Tools (Ayse - CFO)
// ============================================================
export const financeTools: ToolDefinition[] = [
  {
    name: "get_revenue_summary",
    description: "Get total revenue for a specific time period. Returns breakdown by category.",
    input_schema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date (YYYY-MM-DD)" },
        end_date: { type: "string", description: "End date (YYYY-MM-DD)" },
        currency: { type: "string", description: "Filter by currency (default: all)" },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "get_expense_summary",
    description: "Get total expenses for a specific time period. Returns breakdown by category.",
    input_schema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date (YYYY-MM-DD)" },
        end_date: { type: "string", description: "End date (YYYY-MM-DD)" },
        category: { type: "string", description: "Filter by category" },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "get_profit_loss",
    description: "Generate a Profit & Loss statement for a period.",
    input_schema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date (YYYY-MM-DD)" },
        end_date: { type: "string", description: "End date (YYYY-MM-DD)" },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "create_invoice",
    description: "Create a new invoice for a customer with line items.",
    input_schema: {
      type: "object",
      properties: {
        customer_id: { type: "string", description: "Customer UUID" },
        items: {
          type: "array",
          description: "Invoice line items",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              unit_price: { type: "number" },
            },
            required: ["description", "quantity", "unit_price"],
          },
        },
        due_date: { type: "string", description: "Due date (YYYY-MM-DD)" },
        notes: { type: "string", description: "Invoice notes" },
        tax_rate: { type: "number", description: "Tax rate percentage (e.g. 18 for 18%)" },
      },
      required: ["customer_id", "items"],
    },
  },
  {
    name: "list_invoices",
    description: "List invoices with optional filters.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by status: draft | sent | paid | overdue | cancelled" },
        customer_id: { type: "string", description: "Filter by customer" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "record_transaction",
    description: "Record an income or expense transaction.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", description: "income or expense" },
        amount: { type: "number", description: "Transaction amount" },
        category: { type: "string", description: "Category (e.g. salary, rent, services)" },
        description: { type: "string", description: "Description" },
        customer_id: { type: "string", description: "Related customer UUID" },
        date: { type: "string", description: "Transaction date (YYYY-MM-DD)" },
      },
      required: ["type", "amount", "category"],
    },
  },
  {
    name: "get_cash_flow",
    description: "Get cash flow analysis — money in vs money out over time.",
    input_schema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date (YYYY-MM-DD)" },
        end_date: { type: "string", description: "End date (YYYY-MM-DD)" },
        granularity: { type: "string", description: "daily | weekly | monthly" },
      },
      required: ["start_date", "end_date"],
    },
  },
];

// ============================================================
// Sales / CRM Department Tools (Marco - Sales Director)
// ============================================================
export const salesTools: ToolDefinition[] = [
  {
    name: "list_customers",
    description: "List customers with optional filters by stage, tags, or search.",
    input_schema: {
      type: "object",
      properties: {
        stage: { type: "string", description: "Filter by stage: lead | prospect | customer | churned" },
        search: { type: "string", description: "Search by name, email, or company" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "get_customer",
    description: "Get detailed information about a specific customer.",
    input_schema: {
      type: "object",
      properties: {
        customer_id: { type: "string", description: "Customer UUID" },
      },
      required: ["customer_id"],
    },
  },
  {
    name: "create_customer",
    description: "Create a new customer/lead in the CRM.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Customer name" },
        email: { type: "string", description: "Email address" },
        phone: { type: "string", description: "Phone number" },
        company: { type: "string", description: "Company name" },
        source: { type: "string", description: "Lead source: manual | website | referral | social" },
        notes: { type: "string", description: "Initial notes" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_customer_stage",
    description: "Move a customer to a new pipeline stage.",
    input_schema: {
      type: "object",
      properties: {
        customer_id: { type: "string", description: "Customer UUID" },
        stage: { type: "string", description: "New stage: lead | prospect | customer | churned" },
        notes: { type: "string", description: "Reason for stage change" },
      },
      required: ["customer_id", "stage"],
    },
  },
  {
    name: "get_pipeline_summary",
    description: "Get sales pipeline overview — count and value by stage.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "log_customer_interaction",
    description: "Log a touchpoint/interaction with a customer.",
    input_schema: {
      type: "object",
      properties: {
        customer_id: { type: "string", description: "Customer UUID" },
        type: { type: "string", description: "call | email | meeting | note" },
        content: { type: "string", description: "Interaction details" },
      },
      required: ["customer_id", "type", "content"],
    },
  },
  {
    name: "get_sales_forecast",
    description: "Get sales forecast based on current pipeline and historical conversion rates.",
    input_schema: {
      type: "object",
      properties: {
        months_ahead: { type: "number", description: "How many months to forecast (default 3)" },
      },
    },
  },
];

// ============================================================
// Operations Department Tools (Kenji - Operations Manager)
// ============================================================
export const operationsTools: ToolDefinition[] = [
  {
    name: "list_products",
    description: "List inventory items with optional filters.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filter by category" },
        low_stock: { type: "boolean", description: "Show only items below reorder point" },
        search: { type: "string", description: "Search by name or SKU" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "get_product",
    description: "Get detailed information about a specific product.",
    input_schema: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "Product UUID" },
      },
      required: ["product_id"],
    },
  },
  {
    name: "update_stock",
    description: "Update stock quantity for a product (add or subtract).",
    input_schema: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "Product UUID" },
        adjustment: { type: "number", description: "Quantity change (positive=add, negative=subtract)" },
        reason: { type: "string", description: "Reason for adjustment (sale, restock, damaged, audit)" },
      },
      required: ["product_id", "adjustment", "reason"],
    },
  },
  {
    name: "create_product",
    description: "Add a new product to inventory.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Product name" },
        sku: { type: "string", description: "Stock Keeping Unit code" },
        price: { type: "number", description: "Selling price" },
        cost_price: { type: "number", description: "Cost/purchase price" },
        quantity: { type: "number", description: "Initial stock quantity" },
        reorder_at: { type: "number", description: "Reorder point (alert when stock falls below)" },
        category: { type: "string", description: "Product category" },
        supplier: { type: "string", description: "Supplier name" },
      },
      required: ["name", "price"],
    },
  },
  {
    name: "get_inventory_alerts",
    description: "Get all products that are at or below their reorder point.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_inventory_valuation",
    description: "Calculate total inventory value based on cost price and quantities.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filter by category (optional)" },
      },
    },
  },
];

// ============================================================
// Project Management Tools (shared across departments)
// ============================================================
export const projectTools: ToolDefinition[] = [
  {
    name: "list_projects",
    description: "List all projects with optional status filter.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by status: planning | active | on_hold | completed | cancelled" },
      },
    },
  },
  {
    name: "create_project",
    description: "Create a new project.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Project name" },
        description: { type: "string", description: "Project description" },
        priority: { type: "string", description: "low | medium | high | urgent" },
        customer_id: { type: "string", description: "Client/customer UUID" },
        budget: { type: "number", description: "Project budget" },
        start_date: { type: "string", description: "Start date (YYYY-MM-DD)" },
        due_date: { type: "string", description: "Due date (YYYY-MM-DD)" },
      },
      required: ["name"],
    },
  },
  {
    name: "create_task",
    description: "Create a task within a project.",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project UUID" },
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Task details" },
        priority: { type: "string", description: "low | medium | high | urgent" },
        assigned_worker_id: { type: "string", description: "Assign to worker UUID" },
        due_date: { type: "string", description: "Due date (YYYY-MM-DD)" },
        estimated_hours: { type: "number", description: "Estimated hours" },
      },
      required: ["project_id", "title"],
    },
  },
  {
    name: "update_task_status",
    description: "Move a task to a new status.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Task UUID" },
        status: { type: "string", description: "todo | in_progress | review | done | blocked" },
      },
      required: ["task_id", "status"],
    },
  },
];

// ============================================================
// Email Tools (for workers with email accounts)
// ============================================================
export const emailTools: ToolDefinition[] = [
  {
    name: "send_email",
    description: "Compose and send an email from the worker's email account.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "array", items: { type: "string" }, description: "Recipient email addresses" },
        cc: { type: "array", items: { type: "string" }, description: "CC addresses" },
        subject: { type: "string", description: "Email subject" },
        body: { type: "string", description: "Email body (plain text)" },
        linked_customer_id: { type: "string", description: "Link to customer record" },
        linked_invoice_id: { type: "string", description: "Link to invoice (for invoice emails)" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "list_emails",
    description: "List recent emails from the worker's inbox.",
    input_schema: {
      type: "object",
      properties: {
        direction: { type: "string", description: "inbound | outbound | all" },
        search: { type: "string", description: "Search in subject and body" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "get_email",
    description: "Read a specific email by its ID.",
    input_schema: {
      type: "object",
      properties: {
        email_id: { type: "string", description: "Email UUID" },
      },
      required: ["email_id"],
    },
  },
];

// ============================================================
// Document Tools (shared)
// ============================================================
export const documentTools: ToolDefinition[] = [
  {
    name: "list_documents",
    description: "List documents with optional filters.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", description: "contract | proposal | report | policy | template | other" },
        folder: { type: "string", description: "Filter by folder path" },
        search: { type: "string", description: "Search by name or description" },
      },
    },
  },
  {
    name: "get_document",
    description: "Get metadata and download link for a document.",
    input_schema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document UUID" },
      },
      required: ["document_id"],
    },
  },
];

// ============================================================
// Manager-only Tools (delegation & cross-department)
// ============================================================
export const managerTools: ToolDefinition[] = [
  {
    name: "delegate_to_worker",
    description: "Assign a task to a specific worker. The worker will be notified and will execute the task asynchronously.",
    input_schema: {
      type: "object",
      properties: {
        worker_id: { type: "string", description: "Target worker UUID" },
        task_type: { type: "string", description: "Type of task to delegate" },
        instructions: { type: "string", description: "Detailed instructions for the worker" },
        priority: { type: "string", description: "low | medium | high | urgent" },
      },
      required: ["worker_id", "task_type", "instructions"],
    },
  },
  {
    name: "query_worker",
    description: "Ask a specific worker a question and get their response. Used for cross-department queries.",
    input_schema: {
      type: "object",
      properties: {
        worker_id: { type: "string", description: "Worker UUID to query" },
        question: { type: "string", description: "Question to ask the worker" },
      },
      required: ["worker_id", "question"],
    },
  },
  {
    name: "summarize_department",
    description: "Get a summary of a department's current status, tasks, and metrics.",
    input_schema: {
      type: "object",
      properties: {
        department: { type: "string", description: "Department name" },
      },
      required: ["department"],
    },
  },
  {
    name: "list_all_workers",
    description: "Get status of all workers across all departments.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
];

// ============================================================
// Tool Registry — maps department to tool set
// ============================================================
export function getToolsForDepartment(department: string, isManager: boolean = false): ToolDefinition[] {
  const departmentMap: Record<string, ToolDefinition[]> = {
    Finance: [...financeTools, ...documentTools, ...emailTools],
    Sales: [...salesTools, ...documentTools, ...emailTools],
    Operations: [...operationsTools, ...projectTools, ...documentTools],
    "Human Resources": [...projectTools, ...documentTools, ...emailTools],
    Marketing: [...documentTools, ...emailTools],
    "Customer Success": [...salesTools, ...documentTools, ...emailTools],
    Executive: [...financeTools, ...salesTools, ...operationsTools, ...projectTools, ...documentTools, ...emailTools],
  };

  const tools = departmentMap[department] || [...documentTools];

  if (isManager) {
    return [...tools, ...managerTools];
  }

  return tools;
}
