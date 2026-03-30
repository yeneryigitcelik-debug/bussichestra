// ============================================================
// OrchestraOS — Event Routing Pipeline
// Classifies incoming events and routes to the correct AI worker.
// Pure keyword-based — no AI call needed for classification.
// ============================================================

export interface PipelineEvent {
  type: "email" | "notification" | "invoice" | "customer" | "inventory" | "task" | "system";
  subject: string;
  content: string;
  metadata?: Record<string, unknown>;
  from?: string;
  urgency?: "low" | "medium" | "high" | "urgent";
}

export interface RoutingResult {
  target_department: string;
  target_worker_id?: string;
  reason: string;
  urgency: "low" | "medium" | "high" | "urgent";
  suggested_action: string;
}

interface WorkerInfo {
  id: string;
  name: string;
  role: string;
  department: string;
}

// ---- Keyword dictionaries keyed by department ----

const DEPARTMENT_KEYWORDS: Record<string, string[]> = {
  Finance: [
    "finance", "invoice", "payment", "billing", "revenue", "expense",
    "budget", "tax", "accounting", "p&l", "profit", "loss", "cash flow",
    "refund", "receipt", "payroll", "cost", "financial",
  ],
  Sales: [
    "sales", "deal", "proposal", "client", "lead", "prospect",
    "pipeline", "crm", "conversion", "close", "contract", "quotation",
    "quote", "pricing", "discount", "upsell", "demo", "customer acquisition",
  ],
  Operations: [
    "inventory", "stock", "supply", "order", "shipping", "warehouse",
    "logistics", "delivery", "reorder", "supplier", "procurement",
    "supply chain", "tracking", "fulfillment",
    "project", "task", "deadline", "milestone", "sprint", "roadmap",
    "timeline", "deliverable",
  ],
  "Human Resources": [
    "hr", "hiring", "employee", "policy", "training", "onboarding",
    "recruitment", "benefits", "leave", "vacation", "performance review",
    "compensation", "termination", "culture", "team building", "headcount",
  ],
};

const URGENCY_KEYWORDS: Record<"urgent" | "high", string[]> = {
  urgent: ["urgent", "asap", "critical", "emergency", "immediately", "right now"],
  high: ["important", "priority", "deadline", "time-sensitive", "escalate"],
};

// ---- Suggested action templates by event type ----

const SUGGESTED_ACTIONS: Record<string, string> = {
  email: "Read and draft a response",
  notification: "Review and acknowledge",
  invoice: "Review invoice details and process",
  customer: "Review customer record and follow up",
  inventory: "Check stock levels and take action",
  task: "Review task requirements and begin work",
  system: "Investigate system event and report",
};

// ============================================================
// Main classification function
// ============================================================

export function classifyAndRoute(
  event: PipelineEvent,
  workers: WorkerInfo[]
): RoutingResult {
  const textToAnalyze = `${event.subject} ${event.content}`.toLowerCase();

  // ---- 1. Check if a specific worker is mentioned by name ----
  const directWorker = workers.find((w) =>
    textToAnalyze.includes(w.name.toLowerCase())
  );

  if (directWorker) {
    return {
      target_department: directWorker.department,
      target_worker_id: directWorker.id,
      reason: `Event explicitly mentions worker "${directWorker.name}"`,
      urgency: detectUrgency(textToAnalyze, event.urgency),
      suggested_action: SUGGESTED_ACTIONS[event.type] || "Process and respond",
    };
  }

  // ---- 2. Score each department by keyword matches ----
  const scores: Record<string, number> = {};

  for (const [department, keywords] of Object.entries(DEPARTMENT_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (textToAnalyze.includes(keyword)) {
        // Multi-word keywords get a higher weight
        score += keyword.includes(" ") ? 2 : 1;
      }
    }
    if (score > 0) {
      scores[department] = score;
    }
  }

  // ---- 3. Also factor in event type as a signal ----
  const typeBoosts: Record<string, string> = {
    invoice: "Finance",
    customer: "Sales",
    inventory: "Operations",
    task: "Operations",
  };

  if (typeBoosts[event.type]) {
    const dept = typeBoosts[event.type];
    scores[dept] = (scores[dept] || 0) + 2;
  }

  // ---- 4. Pick the highest-scoring department ----
  let targetDepartment = "Executive"; // default fallback — manager handles it
  let bestScore = 0;
  let reason = "No department-specific keywords detected; routing to manager for delegation";

  for (const [dept, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      targetDepartment = dept;
      reason = `Matched ${score} keyword(s) for ${dept} department`;
    }
  }

  // ---- 5. Find the worker in the target department ----
  const targetWorker = workers.find(
    (w) => w.department === targetDepartment
  );

  // ---- 6. Detect urgency ----
  const urgency = detectUrgency(textToAnalyze, event.urgency);

  return {
    target_department: targetDepartment,
    target_worker_id: targetWorker?.id,
    reason,
    urgency,
    suggested_action: SUGGESTED_ACTIONS[event.type] || "Process and respond",
  };
}

// ============================================================
// Urgency detection helper
// ============================================================

function detectUrgency(
  text: string,
  explicitUrgency?: "low" | "medium" | "high" | "urgent"
): "low" | "medium" | "high" | "urgent" {
  // Explicit urgency from the event takes precedence
  if (explicitUrgency) {
    return explicitUrgency;
  }

  for (const keyword of URGENCY_KEYWORDS.urgent) {
    if (text.includes(keyword)) return "urgent";
  }

  for (const keyword of URGENCY_KEYWORDS.high) {
    if (text.includes(keyword)) return "high";
  }

  return "medium";
}
