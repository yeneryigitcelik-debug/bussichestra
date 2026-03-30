// ============================================================
// OrchestraOS — Application Constants
// ============================================================

export const APP_NAME = "OrchestraOS";
export const APP_DESCRIPTION = "AI-Powered Business Operating System";

// --- Worker Statuses ---
export const WORKER_STATUSES = {
  ACTIVE: "active",
  IDLE: "idle",
  STUCK: "stuck",
  OFFLINE: "offline",
} as const;

export type WorkerStatus = (typeof WORKER_STATUSES)[keyof typeof WORKER_STATUSES];

// --- Departments ---
export const DEPARTMENTS = {
  FINANCE: "Finance",
  SALES: "Sales",
  OPERATIONS: "Operations",
  HR: "Human Resources",
  MARKETING: "Marketing",
  LEGAL: "Legal",
  IT: "IT & Technology",
  CUSTOMER_SUCCESS: "Customer Success",
  EXECUTIVE: "Executive",
} as const;

export type DepartmentName = (typeof DEPARTMENTS)[keyof typeof DEPARTMENTS];

// --- AI Models ---
export const AI_MODELS = {
  WORKER: "claude-sonnet-4-20250514",
  MANAGER: "claude-opus-4-20250514",
} as const;

// --- Notification Types ---
export const NOTIFICATION_TYPES = {
  WORKER_MESSAGE: "worker_message",
  TASK_COMPLETED: "task_completed",
  TASK_FAILED: "task_failed",
  INVOICE_PAID: "invoice_paid",
  INVOICE_OVERDUE: "invoice_overdue",
  INVENTORY_LOW: "inventory_low",
  CUSTOMER_NEW: "customer_new",
  CUSTOMER_CHURNED: "customer_churned",
  SYSTEM_ALERT: "system_alert",
  WORKER_STUCK: "worker_stuck",
  APPROVAL_NEEDED: "approval_needed",
  APPROVAL_DECIDED: "approval_decided",
  REPORT_READY: "report_ready",
  EMAIL_RECEIVED: "email_received",
  PROJECT_DEADLINE: "project_deadline",
  SCHEDULE_COMPLETED: "schedule_completed",
} as const;

// --- Activity Actions ---
export const ACTIVITY_ACTIONS = {
  CREATED: "created",
  UPDATED: "updated",
  DELETED: "deleted",
  SENT: "sent",
  COMPLETED: "completed",
  FAILED: "failed",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

// --- Invoice Statuses ---
export const INVOICE_STATUSES = {
  DRAFT: "draft",
  SENT: "sent",
  PAID: "paid",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
} as const;

// --- Customer Stages ---
export const CUSTOMER_STAGES = {
  LEAD: "lead",
  PROSPECT: "prospect",
  CUSTOMER: "customer",
  CHURNED: "churned",
} as const;

// --- Project Statuses ---
export const PROJECT_STATUSES = {
  PLANNING: "planning",
  ACTIVE: "active",
  ON_HOLD: "on_hold",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

// --- Task Statuses ---
export const TASK_STATUSES = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  REVIEW: "review",
  DONE: "done",
  BLOCKED: "blocked",
} as const;

// --- Priority Levels ---
export const PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export type Priority = (typeof PRIORITIES)[keyof typeof PRIORITIES];

// --- Status Colors (for UI) ---
export const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500",
  idle: "bg-yellow-500",
  stuck: "bg-red-500",
  offline: "bg-gray-500",
  draft: "bg-gray-500",
  sent: "bg-blue-500",
  paid: "bg-green-500",
  overdue: "bg-red-500",
  cancelled: "bg-gray-400",
  pending: "bg-yellow-500",
  running: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
  lead: "bg-gray-400",
  prospect: "bg-yellow-500",
  customer: "bg-green-500",
  churned: "bg-red-400",
  planning: "bg-purple-500",
  on_hold: "bg-orange-500",
  todo: "bg-gray-400",
  in_progress: "bg-blue-500",
  review: "bg-purple-500",
  done: "bg-green-500",
  blocked: "bg-red-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
  expired: "bg-gray-400",
};
