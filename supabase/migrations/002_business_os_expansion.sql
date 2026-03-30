-- ============================================================
-- OrchestraOS — Full Business Operating System Expansion
-- Migration 002: Invoices, Documents, Notifications,
--   Activity Logs, Worker Knowledge, Email, Projects
-- ============================================================

-- ============================================================
-- FIX: Organizations RLS policy (was missing)
-- ============================================================
CREATE POLICY "Users can read own organization" ON organizations
  FOR SELECT USING (
    id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Owners can update own organization" ON organizations
  FOR UPDATE USING (
    id = (SELECT org_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'owner'
  );

-- ============================================================
-- FIX: Users table needs INSERT policy for signup
-- ============================================================
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- ENHANCE: customers table — add more CRM fields
-- ============================================================
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',     -- manual | website | referral | social
  ADD COLUMN IF NOT EXISTS assigned_worker_id UUID REFERENCES ai_workers(id),
  ADD COLUMN IF NOT EXISTS lifetime_value NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- ENHANCE: products table — full inventory system
-- ============================================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'piece',        -- piece | kg | liter | hour | box
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS supplier TEXT,
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,                     -- warehouse location
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- 12. Invoices
-- ============================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  invoice_number TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'invoice',     -- invoice | quote | credit_note | receipt
  status TEXT DEFAULT 'draft',              -- draft | sent | paid | overdue | cancelled
  currency TEXT DEFAULT 'USD',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES ai_workers(id),  -- which worker created it
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org invoices" ON invoices
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- 13. Invoice Items (line items)
-- ============================================================
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage invoice items via invoice" ON invoice_items
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE org_id = (
        SELECT org_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ============================================================
-- 14. Documents (file/document management)
-- ============================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,                        -- contract | proposal | report | policy | template | other
  mime_type TEXT,
  file_url TEXT,                              -- Supabase Storage URL
  file_size INTEGER,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  folder TEXT DEFAULT '/',                    -- virtual folder path
  uploaded_by UUID REFERENCES users(id),
  linked_customer_id UUID REFERENCES customers(id),
  linked_worker_id UUID REFERENCES ai_workers(id),
  is_template BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org documents" ON documents
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- 15. Notifications (in-app notification system)
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                        -- worker_message | task_completed | invoice_paid
                                             -- inventory_low | customer_new | system_alert
                                             -- worker_stuck | approval_needed | report_ready
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,                            -- deep link within app
  source_worker_id UUID REFERENCES ai_workers(id),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 16. Activity Logs (audit trail — who did what)
-- ============================================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL,                  -- user | worker | system
  actor_id TEXT NOT NULL,                     -- user UUID or worker UUID
  actor_name TEXT,                            -- human-readable name
  action TEXT NOT NULL,                       -- created | updated | deleted | sent | completed | failed
  entity_type TEXT NOT NULL,                  -- invoice | customer | transaction | product | conversation | worker_task | document
  entity_id UUID,
  entity_name TEXT,                           -- human-readable: "Invoice #1042" or "Customer: Acme Corp"
  details JSONB DEFAULT '{}',                -- extra context (old_value, new_value, etc.)
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org activity" ON activity_logs
  FOR SELECT USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- 17. Worker Knowledge (persistent memory per worker)
-- ============================================================
CREATE TABLE worker_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES ai_workers(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,                    -- fact | preference | learning | context | procedure
  content TEXT NOT NULL,                      -- the actual knowledge
  source TEXT,                                -- conversation | manual | observation
  importance INTEGER DEFAULT 5,              -- 1-10 priority
  expires_at TIMESTAMPTZ,                    -- optional TTL for temporary knowledge
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE worker_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org worker knowledge" ON worker_knowledge
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- 18. Worker Messages (inter-worker communication)
-- ============================================================
CREATE TABLE worker_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  from_worker_id UUID REFERENCES ai_workers(id) ON DELETE CASCADE,
  to_worker_id UUID REFERENCES ai_workers(id) ON DELETE CASCADE,
  subject TEXT,
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}',                -- why this message was sent (task context)
  status TEXT DEFAULT 'pending',             -- pending | read | responded
  parent_id UUID REFERENCES worker_messages(id), -- thread support
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE worker_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org worker messages" ON worker_messages
  FOR SELECT USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- 19. Email Accounts (worker email configuration)
-- ============================================================
CREATE TABLE email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES ai_workers(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  display_name TEXT,
  provider TEXT DEFAULT 'gmail',             -- gmail | outlook | smtp
  credentials JSONB DEFAULT '{}',            -- encrypted tokens
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email accounts" ON email_accounts
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'admin')
  );

-- ============================================================
-- 20. Email Messages (sent/received/drafted)
-- ============================================================
CREATE TABLE email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES ai_workers(id),
  direction TEXT NOT NULL,                   -- inbound | outbound
  status TEXT DEFAULT 'draft',               -- draft | sending | sent | failed | received
  from_address TEXT NOT NULL,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[] DEFAULT '{}',
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  attachments JSONB DEFAULT '[]',            -- [{name, url, size, mime_type}]
  external_id TEXT,                           -- Gmail/Outlook message ID
  thread_id TEXT,                             -- email thread grouping
  linked_customer_id UUID REFERENCES customers(id),
  linked_invoice_id UUID REFERENCES invoices(id),
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org emails" ON email_messages
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- 21. Projects (project management)
-- ============================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',              -- planning | active | on_hold | completed | cancelled
  priority TEXT DEFAULT 'medium',            -- low | medium | high | urgent
  owner_worker_id UUID REFERENCES ai_workers(id),
  customer_id UUID REFERENCES customers(id), -- client project
  budget NUMERIC(12,2),
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org projects" ON projects
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- 22. Project Tasks (kanban-style task tracking)
-- ============================================================
CREATE TABLE project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',                -- todo | in_progress | review | done | blocked
  priority TEXT DEFAULT 'medium',            -- low | medium | high | urgent
  assigned_worker_id UUID REFERENCES ai_workers(id),
  assigned_user_id UUID REFERENCES users(id),
  parent_task_id UUID REFERENCES project_tasks(id), -- subtask support
  due_date DATE,
  estimated_hours NUMERIC(6,1),
  actual_hours NUMERIC(6,1),
  sort_order INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org project tasks" ON project_tasks
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- 23. Approval Requests (workflow approvals)
-- ============================================================
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                        -- invoice_send | expense_approve | purchase_order
                                             -- worker_create | project_budget | document_publish
  status TEXT DEFAULT 'pending',             -- pending | approved | rejected | expired
  title TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL,                 -- invoice | transaction | project | document
  entity_id UUID NOT NULL,
  requested_by_type TEXT NOT NULL,           -- user | worker
  requested_by_id TEXT NOT NULL,
  requested_by_name TEXT,
  approved_by UUID REFERENCES users(id),
  decision_note TEXT,
  decided_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org approvals" ON approval_requests
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- 24. Tags (universal tagging system)
-- ============================================================
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',               -- hex color for UI
  category TEXT,                              -- customer | product | project | document | general
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, name)
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org tags" ON tags
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- 25. Recurring Schedules (automated recurring actions)
-- ============================================================
CREATE TABLE recurring_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES ai_workers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                        -- invoice_generate | report_create | inventory_check
                                             -- heartbeat_ping | email_digest | data_backup
  name TEXT NOT NULL,
  description TEXT,
  cron_expression TEXT NOT NULL,              -- standard cron: "0 9 * * 1" = every Monday 9AM
  config JSONB DEFAULT '{}',                 -- action-specific config
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org schedules" ON recurring_schedules
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- ENHANCE: ai_workers — add language, manager flag, knowledge count
-- ============================================================
ALTER TABLE ai_workers
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',        -- primary language
  ADD COLUMN IF NOT EXISTS is_manager BOOLEAN DEFAULT false,  -- can delegate to other workers
  ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'claude-sonnet-4-20250514',
  ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 4096,
  ADD COLUMN IF NOT EXISTS temperature NUMERIC(3,2) DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- ENHANCE: conversations — add status, pinned, summary
-- ============================================================
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',      -- active | archived | deleted
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS summary TEXT,                       -- AI-generated conversation summary
  ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- ============================================================
-- ENHANCE: worker_tasks — add priority, assigned by, retries
-- ============================================================
ALTER TABLE worker_tasks
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',    -- low | medium | high | urgent
  ADD COLUMN IF NOT EXISTS assigned_by TEXT,                   -- user | worker | system | schedule
  ADD COLUMN IF NOT EXISTS assigned_by_id TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- ENHANCE: transactions — add invoice link, approval
-- ============================================================
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id),
  ADD COLUMN IF NOT EXISTS payment_method TEXT,                -- cash | bank_transfer | credit_card | stripe
  ADD COLUMN IF NOT EXISTS reference_number TEXT,
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- Additional Indexes for new tables
-- ============================================================
CREATE INDEX idx_invoices_org ON invoices(org_id, status);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_number ON invoices(org_id, invoice_number);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_documents_org ON documents(org_id, type);
CREATE INDEX idx_documents_folder ON documents(org_id, folder);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_activity_logs_org ON activity_logs(org_id, created_at DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_worker_knowledge_worker ON worker_knowledge(worker_id, category);
CREATE INDEX idx_worker_messages_to ON worker_messages(to_worker_id, status);
CREATE INDEX idx_worker_messages_from ON worker_messages(from_worker_id, created_at DESC);
CREATE INDEX idx_email_messages_account ON email_messages(account_id, direction, created_at DESC);
CREATE INDEX idx_email_messages_thread ON email_messages(thread_id);
CREATE INDEX idx_projects_org ON projects(org_id, status);
CREATE INDEX idx_project_tasks_project ON project_tasks(project_id, status);
CREATE INDEX idx_project_tasks_assigned ON project_tasks(assigned_worker_id, status);
CREATE INDEX idx_approval_requests_org ON approval_requests(org_id, status);
CREATE INDEX idx_recurring_schedules_next ON recurring_schedules(next_run_at) WHERE is_active = true;
CREATE INDEX idx_customers_assigned ON customers(assigned_worker_id);
CREATE INDEX idx_customers_stage ON customers(org_id, stage);
