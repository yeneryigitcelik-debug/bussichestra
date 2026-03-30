import { handleFinanceTool } from "./finance";
import { handleCrmTool } from "./crm";
import { handleInventoryTool } from "./inventory";
import { handleProjectTool } from "./projects";
import { handleManagerTool } from "./manager";
import { handleEmailTool } from "./email";
import { handleDocumentTool } from "./documents";

const FINANCE_TOOLS = [
  "get_revenue_summary", "get_expense_summary", "get_profit_loss",
  "create_invoice", "list_invoices", "record_transaction", "get_cash_flow",
];

const CRM_TOOLS = [
  "list_customers", "get_customer", "create_customer",
  "update_customer_stage", "get_pipeline_summary",
  "log_customer_interaction", "get_sales_forecast",
];

const INVENTORY_TOOLS = [
  "list_products", "get_product", "update_stock",
  "create_product", "get_inventory_alerts", "get_inventory_valuation",
];

const PROJECT_TOOLS = [
  "list_projects", "create_project", "create_task", "update_task_status",
];

const MANAGER_TOOLS = [
  "delegate_to_worker", "query_worker", "summarize_department", "list_all_workers",
];

const EMAIL_TOOLS = [
  "send_email", "list_emails", "get_email",
];

const DOCUMENT_TOOLS = [
  "list_documents", "get_document",
];

/**
 * Execute a tool call. Uses Prisma internally (no Supabase dependency).
 * The orgId parameter ensures tenant isolation.
 */
export async function executeToolCall(
  toolName: string,
  input: Record<string, unknown>,
  orgId: string,
): Promise<string> {
  try {
    if (FINANCE_TOOLS.includes(toolName)) {
      return await handleFinanceTool(toolName, input, orgId);
    }
    if (CRM_TOOLS.includes(toolName)) {
      return await handleCrmTool(toolName, input, orgId);
    }
    if (INVENTORY_TOOLS.includes(toolName)) {
      return await handleInventoryTool(toolName, input, orgId);
    }
    if (PROJECT_TOOLS.includes(toolName)) {
      return await handleProjectTool(toolName, input, orgId);
    }
    if (MANAGER_TOOLS.includes(toolName)) {
      return await handleManagerTool(toolName, input, orgId);
    }
    if (EMAIL_TOOLS.includes(toolName)) {
      return await handleEmailTool(toolName, input, orgId);
    }
    if (DOCUMENT_TOOLS.includes(toolName)) {
      return await handleDocumentTool(toolName, input, orgId);
    }

    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool execution failed";
    return JSON.stringify({ error: message });
  }
}
