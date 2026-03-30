-- OrchestraOS Initial Schema
-- Phase 1: Core tables for worker chat system

-- 1. Organizations (tenants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'starter',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 2. Users (human operators)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org users" ON users
  FOR SELECT USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- 3. Departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org departments" ON departments
  FOR SELECT USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- 4. AI Workers
CREATE TABLE ai_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  persona TEXT NOT NULL,
  avatar_url TEXT,
  email TEXT,
  status TEXT DEFAULT 'active',
  tools JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org workers" ON ai_workers
  FOR SELECT USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage workers" ON ai_workers
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'admin')
  );

-- 5. Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES ai_workers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations" ON conversations
  FOR ALL USING (user_id = auth.uid());

-- 6. Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own messages" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- 7. Worker Heartbeats
CREATE TABLE worker_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES ai_workers(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  load REAL DEFAULT 0,
  last_task TEXT,
  checked_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE worker_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org heartbeats" ON worker_heartbeats
  FOR SELECT USING (
    worker_id IN (
      SELECT id FROM ai_workers WHERE org_id = (
        SELECT org_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- 8. Customers (CRM) — Phase 3
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  stage TEXT DEFAULT 'lead',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org customers" ON customers
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- 9. Transactions (Finance) — Phase 3
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  category TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  customer_id UUID REFERENCES customers(id),
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org transactions" ON transactions
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- 10. Products (Inventory) — Phase 3
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER DEFAULT 0,
  reorder_at INTEGER DEFAULT 10,
  price NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org products" ON products
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- 11. Worker Tasks (async queue) — Phase 3
CREATE TABLE worker_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES ai_workers(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  input JSONB DEFAULT '{}',
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE worker_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org tasks" ON worker_tasks
  FOR SELECT USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_workers_org ON ai_workers(org_id);
CREATE INDEX idx_heartbeats_worker ON worker_heartbeats(worker_id, checked_at DESC);
CREATE INDEX idx_tasks_status ON worker_tasks(status, created_at);
CREATE INDEX idx_transactions_org ON transactions(org_id, date DESC);
CREATE INDEX idx_customers_org ON customers(org_id);
CREATE INDEX idx_conversations_worker ON conversations(worker_id, updated_at DESC);
