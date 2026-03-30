// ============================================================
// OrchestraOS — Complete Database Type Definitions
// ============================================================

// --- Core Entities ---

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: "starter" | "business" | "enterprise";
  settings: Record<string, unknown>;
  created_at: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "admin" | "member";
  created_at: string;
}

export interface Department {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

// --- AI Workers ---

export interface AIWorker {
  id: string;
  org_id: string;
  department_id: string | null;
  name: string;
  role: string;
  persona: string;
  avatar_url: string | null;
  email: string | null;
  status: "active" | "idle" | "stuck" | "offline";
  tools: string[];
  settings: Record<string, unknown>;
  language: string;
  is_manager: boolean;
  model: string;
  max_tokens: number;
  temperature: number;
  created_at: string;
  updated_at: string;
}

export interface WorkerHeartbeat {
  id: string;
  worker_id: string;
  status: "active" | "idle" | "stuck";
  load: number;
  last_task: string | null;
  checked_at: string;
}

export interface WorkerKnowledge {
  id: string;
  worker_id: string;
  org_id: string;
  category: "fact" | "preference" | "learning" | "context" | "procedure";
  content: string;
  source: "conversation" | "manual" | "observation" | null;
  importance: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkerMessage {
  id: string;
  org_id: string;
  from_worker_id: string;
  to_worker_id: string;
  subject: string | null;
  content: string;
  context: Record<string, unknown>;
  status: "pending" | "read" | "responded";
  parent_id: string | null;
  created_at: string;
}

export interface WorkerTask {
  id: string;
  worker_id: string;
  org_id: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
  priority: "low" | "medium" | "high" | "urgent";
  input: Record<string, unknown>;
  result: Record<string, unknown> | null;
  assigned_by: "user" | "worker" | "system" | "schedule" | null;
  assigned_by_id: string | null;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

// --- Conversations & Messages ---

export interface Conversation {
  id: string;
  org_id: string;
  worker_id: string;
  user_id: string | null;
  title: string | null;
  status: "active" | "archived" | "deleted";
  is_pinned: boolean;
  summary: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls: ToolCall[] | null;
  tool_results: ToolResult[] | null;
  created_at: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

// --- CRM ---

export interface Customer {
  id: string;
  org_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  stage: "lead" | "prospect" | "customer" | "churned";
  notes: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  source: "manual" | "website" | "referral" | "social" | null;
  assigned_worker_id: string | null;
  lifetime_value: number;
  last_contact_at: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// --- Finance ---

export interface Transaction {
  id: string;
  org_id: string;
  type: "income" | "expense";
  category: string | null;
  amount: number;
  currency: string;
  description: string | null;
  customer_id: string | null;
  invoice_id: string | null;
  payment_method: "cash" | "bank_transfer" | "credit_card" | "stripe" | null;
  reference_number: string | null;
  is_recurring: boolean;
  approved_by: string | null;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  org_id: string;
  customer_id: string | null;
  invoice_number: string;
  type: "invoice" | "quote" | "credit_note" | "receipt";
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  notes: string | null;
  due_date: string | null;
  paid_at: string | null;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
  sort_order: number;
  created_at: string;
}

// --- Inventory ---

export interface Product {
  id: string;
  org_id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  quantity: number;
  reorder_at: number;
  price: number | null;
  cost_price: number | null;
  unit: string;
  supplier: string | null;
  barcode: string | null;
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Documents ---

export interface Document {
  id: string;
  org_id: string;
  name: string;
  type: "contract" | "proposal" | "report" | "policy" | "template" | "other";
  mime_type: string | null;
  file_url: string | null;
  file_size: number | null;
  description: string | null;
  tags: string[];
  folder: string;
  uploaded_by: string | null;
  linked_customer_id: string | null;
  linked_worker_id: string | null;
  is_template: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

// --- Email ---

export interface EmailAccount {
  id: string;
  org_id: string;
  worker_id: string;
  email_address: string;
  display_name: string | null;
  provider: "gmail" | "outlook" | "smtp";
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
}

export interface EmailMessage {
  id: string;
  org_id: string;
  account_id: string;
  worker_id: string | null;
  direction: "inbound" | "outbound";
  status: "draft" | "sending" | "sent" | "failed" | "received";
  from_address: string;
  to_addresses: string[];
  cc_addresses: string[];
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  attachments: EmailAttachment[];
  external_id: string | null;
  thread_id: string | null;
  linked_customer_id: string | null;
  linked_invoice_id: string | null;
  sent_at: string | null;
  received_at: string | null;
  created_at: string;
}

export interface EmailAttachment {
  name: string;
  url: string;
  size: number;
  mime_type: string;
}

// --- Projects ---

export interface Project {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  owner_worker_id: string | null;
  customer_id: string | null;
  budget: number | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  tags: string[];
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  org_id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "review" | "done" | "blocked";
  priority: "low" | "medium" | "high" | "urgent";
  assigned_worker_id: string | null;
  assigned_user_id: string | null;
  parent_task_id: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Notifications & Activity ---

export interface Notification {
  id: string;
  org_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  action_url: string | null;
  source_worker_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export type NotificationType =
  | "worker_message"
  | "task_completed"
  | "task_failed"
  | "invoice_paid"
  | "invoice_overdue"
  | "inventory_low"
  | "customer_new"
  | "customer_churned"
  | "system_alert"
  | "worker_stuck"
  | "approval_needed"
  | "approval_decided"
  | "report_ready"
  | "email_received"
  | "project_deadline"
  | "schedule_completed";

export interface ActivityLog {
  id: string;
  org_id: string;
  actor_type: "user" | "worker" | "system";
  actor_id: string;
  actor_name: string | null;
  action: "created" | "updated" | "deleted" | "sent" | "completed" | "failed" | "approved" | "rejected";
  entity_type: ActivityEntityType;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export type ActivityEntityType =
  | "invoice"
  | "customer"
  | "transaction"
  | "product"
  | "conversation"
  | "worker_task"
  | "document"
  | "project"
  | "project_task"
  | "email"
  | "worker"
  | "approval";

// --- Approvals ---

export interface ApprovalRequest {
  id: string;
  org_id: string;
  type: "invoice_send" | "expense_approve" | "purchase_order" | "worker_create" | "project_budget" | "document_publish";
  status: "pending" | "approved" | "rejected" | "expired";
  title: string;
  description: string | null;
  entity_type: string;
  entity_id: string;
  requested_by_type: "user" | "worker";
  requested_by_id: string;
  requested_by_name: string | null;
  approved_by: string | null;
  decision_note: string | null;
  decided_at: string | null;
  expires_at: string | null;
  created_at: string;
}

// --- Tags & Scheduling ---

export interface Tag {
  id: string;
  org_id: string;
  name: string;
  color: string;
  category: "customer" | "product" | "project" | "document" | "general" | null;
  created_at: string;
}

export interface RecurringSchedule {
  id: string;
  org_id: string;
  worker_id: string;
  type: "invoice_generate" | "report_create" | "inventory_check" | "heartbeat_ping" | "email_digest" | "data_backup";
  name: string;
  description: string | null;
  cron_expression: string;
  config: Record<string, unknown>;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  created_at: string;
}

// ============================================================
// Supabase Database Type Mapping
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableDef<T> = { Row: T; Insert: any; Update: any };

export interface Database {
  public: {
    Tables: {
      // Core
      organizations: TableDef<Organization>;
      users: TableDef<User>;
      departments: TableDef<Department>;
      // AI Workers
      ai_workers: TableDef<AIWorker>;
      worker_heartbeats: TableDef<WorkerHeartbeat>;
      worker_knowledge: TableDef<WorkerKnowledge>;
      worker_messages: TableDef<WorkerMessage>;
      worker_tasks: TableDef<WorkerTask>;
      // Conversations
      conversations: TableDef<Conversation>;
      messages: TableDef<Message>;
      // CRM
      customers: TableDef<Customer>;
      // Finance
      transactions: TableDef<Transaction>;
      invoices: TableDef<Invoice>;
      invoice_items: TableDef<InvoiceItem>;
      // Inventory
      products: TableDef<Product>;
      // Documents
      documents: TableDef<Document>;
      // Email
      email_accounts: TableDef<EmailAccount>;
      email_messages: TableDef<EmailMessage>;
      // Projects
      projects: TableDef<Project>;
      project_tasks: TableDef<ProjectTask>;
      // System
      notifications: TableDef<Notification>;
      activity_logs: TableDef<ActivityLog>;
      approval_requests: TableDef<ApprovalRequest>;
      tags: TableDef<Tag>;
      recurring_schedules: TableDef<RecurringSchedule>;
    };
  };
}
