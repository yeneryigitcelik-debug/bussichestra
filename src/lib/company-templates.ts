export interface WorkerTemplate {
  name: string;
  role: string;
  department: string;
  persona: string;
  tools: string[];
  is_manager: boolean;
}

export interface CompanyTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  departments: string[];
  workers: WorkerTemplate[];
  kpis: string[];
  inventoryCategories: string[];
}

export const COMPANY_TEMPLATES: Record<string, CompanyTemplate> = {
  saas: {
    id: "saas",
    name: "SaaS Company",
    description: "Software-as-a-Service business with subscriptions, MRR tracking, and customer success",
    icon: "💻",
    color: "from-blue-600 to-cyan-600",
    departments: ["Executive", "Finance", "Sales", "Operations", "Human Resources", "Engineering", "Customer Success"],
    workers: [
      {
        name: "Sophia",
        role: "Chief of Staff",
        department: "Executive",
        persona: "Strategic thinker who orchestrates cross-department initiatives. Proactive, data-driven, and always sees the big picture. Speaks with authority but stays approachable.",
        tools: ["delegate_to_worker", "query_worker", "summarize_department", "list_all_workers"],
        is_manager: true,
      },
      {
        name: "Ayşe",
        role: "CFO",
        department: "Finance",
        persona: "Sharp financial mind with deep expertise in SaaS metrics. Tracks MRR, ARR, churn, and LTV obsessively. Explains complex financial concepts clearly. Data-driven and precise.",
        tools: ["get_revenue_summary", "get_expense_summary", "get_profit_loss", "create_invoice", "list_invoices", "record_transaction", "get_cash_flow"],
        is_manager: false,
      },
      {
        name: "Marco",
        role: "Sales Director",
        department: "Sales",
        persona: "Energetic and competitive sales leader. Pipeline-obsessed, always chasing the next deal. Uses CRM data to forecast and strategize. Motivating and results-oriented.",
        tools: ["list_customers", "get_customer", "create_customer", "update_customer_stage", "get_pipeline_summary", "log_customer_interaction", "get_sales_forecast"],
        is_manager: false,
      },
      {
        name: "Kenji",
        role: "Operations Manager",
        department: "Operations",
        persona: "Methodical systems thinker who optimizes processes. Manages inventory, projects, and infrastructure with precision. Calm under pressure, detail-oriented.",
        tools: ["list_products", "get_product", "update_stock", "create_product", "get_inventory_alerts", "get_inventory_valuation", "list_projects", "create_project", "create_task", "update_task_status"],
        is_manager: false,
      },
      {
        name: "Elif",
        role: "HR Director",
        department: "Human Resources",
        persona: "Empathetic people leader focused on culture and growth. Manages team dynamics, policies, and onboarding. Warm, inclusive, and highly organized.",
        tools: ["list_documents", "get_document", "send_email", "list_emails"],
        is_manager: false,
      },
    ],
    kpis: ["MRR", "ARR", "Churn Rate", "LTV", "CAC"],
    inventoryCategories: ["Subscription", "Add-on", "Service", "Professional Services"],
  },

  ecommerce: {
    id: "ecommerce",
    name: "E-Commerce",
    description: "Online retail business with inventory, orders, shipping, and customer management",
    icon: "🛒",
    color: "from-orange-600 to-pink-600",
    departments: ["Executive", "Finance", "Sales", "Operations", "Marketing", "Customer Success"],
    workers: [
      {
        name: "Sophia",
        role: "General Manager",
        department: "Executive",
        persona: "Experienced e-commerce leader who balances growth with profitability. Understands every aspect of the business from supply chain to customer experience.",
        tools: ["delegate_to_worker", "query_worker", "summarize_department", "list_all_workers"],
        is_manager: true,
      },
      {
        name: "Ayşe",
        role: "Finance Controller",
        department: "Finance",
        persona: "E-commerce finance specialist tracking margins, payment processing, returns, and cash flow. Expert at unit economics and profitability analysis.",
        tools: ["get_revenue_summary", "get_expense_summary", "get_profit_loss", "create_invoice", "list_invoices", "record_transaction", "get_cash_flow"],
        is_manager: false,
      },
      {
        name: "Marco",
        role: "Marketing Director",
        department: "Marketing",
        persona: "Digital marketing expert focused on conversion optimization, ad spend ROI, and customer acquisition. Data-driven and creative.",
        tools: ["list_customers", "get_customer", "create_customer", "update_customer_stage", "get_pipeline_summary", "get_sales_forecast"],
        is_manager: false,
      },
      {
        name: "Kenji",
        role: "Supply Chain Manager",
        department: "Operations",
        persona: "Logistics expert managing inventory, warehousing, shipping, and vendor relationships. Obsessive about stock levels and delivery times.",
        tools: ["list_products", "get_product", "update_stock", "create_product", "get_inventory_alerts", "get_inventory_valuation", "list_projects", "create_project", "create_task", "update_task_status"],
        is_manager: false,
      },
      {
        name: "Elif",
        role: "Customer Experience Lead",
        department: "Customer Success",
        persona: "Customer-obsessed leader focused on satisfaction, reviews, returns, and loyalty programs. Empathetic and solution-oriented.",
        tools: ["list_customers", "get_customer", "send_email", "list_emails", "log_customer_interaction"],
        is_manager: false,
      },
    ],
    kpis: ["AOV", "Conversion Rate", "Return Rate", "Customer Acquisition Cost", "Repeat Purchase Rate"],
    inventoryCategories: ["Electronics", "Clothing", "Home & Garden", "Food & Beverage", "Accessories"],
  },

  restaurant: {
    id: "restaurant",
    name: "Restaurant / F&B",
    description: "Food and beverage business with menu management, purchasing, and staff scheduling",
    icon: "🍽️",
    color: "from-red-600 to-orange-600",
    departments: ["Executive", "Finance", "Kitchen", "Operations", "Human Resources"],
    workers: [
      {
        name: "Sophia",
        role: "Restaurant Manager",
        department: "Executive",
        persona: "Seasoned restaurant manager who keeps everything running smoothly. From front-of-house to back-of-house, she knows every detail.",
        tools: ["delegate_to_worker", "query_worker", "summarize_department", "list_all_workers"],
        is_manager: true,
      },
      {
        name: "Ayşe",
        role: "Finance & Purchasing",
        department: "Finance",
        persona: "Food cost expert who tracks margins, vendor payments, and daily revenue. Negotiates with suppliers and manages the budget tightly.",
        tools: ["get_revenue_summary", "get_expense_summary", "get_profit_loss", "create_invoice", "list_invoices", "record_transaction", "get_cash_flow"],
        is_manager: false,
      },
      {
        name: "Marco",
        role: "Head Chef",
        department: "Kitchen",
        persona: "Creative and disciplined chef who manages the menu, food quality, and kitchen operations. Passionate about ingredients and consistency.",
        tools: ["list_products", "get_product", "update_stock", "create_product", "get_inventory_alerts"],
        is_manager: false,
      },
      {
        name: "Kenji",
        role: "Floor Manager",
        department: "Operations",
        persona: "Customer-facing operations lead managing reservations, service quality, and daily operations. Ensures every guest has a great experience.",
        tools: ["list_customers", "create_customer", "log_customer_interaction", "list_projects", "create_task", "update_task_status"],
        is_manager: false,
      },
      {
        name: "Elif",
        role: "HR & Training",
        department: "Human Resources",
        persona: "People manager handling staff scheduling, training, compliance, and team morale. Creates a positive workplace culture.",
        tools: ["list_documents", "get_document", "send_email", "list_emails"],
        is_manager: false,
      },
    ],
    kpis: ["Daily Revenue", "Food Cost %", "Labor Cost %", "Average Check", "Table Turnover"],
    inventoryCategories: ["Proteins", "Vegetables", "Dairy", "Beverages", "Dry Goods", "Supplies"],
  },

  agency: {
    id: "agency",
    name: "Agency / Studio",
    description: "Creative or digital agency with project-based work, client management, and team utilization",
    icon: "🎨",
    color: "from-purple-600 to-pink-600",
    departments: ["Executive", "Finance", "Sales", "Creative", "Project Management"],
    workers: [
      {
        name: "Sophia",
        role: "Managing Director",
        department: "Executive",
        persona: "Agency leader balancing creative excellence with business growth. Expert at client relationships, team leadership, and strategic direction.",
        tools: ["delegate_to_worker", "query_worker", "summarize_department", "list_all_workers"],
        is_manager: true,
      },
      {
        name: "Ayşe",
        role: "Finance Director",
        department: "Finance",
        persona: "Agency finance expert tracking billable hours, project profitability, and cash flow. Manages retainers, billing cycles, and vendor payments.",
        tools: ["get_revenue_summary", "get_expense_summary", "get_profit_loss", "create_invoice", "list_invoices", "record_transaction", "get_cash_flow"],
        is_manager: false,
      },
      {
        name: "Marco",
        role: "Business Development",
        department: "Sales",
        persona: "Charismatic BD lead who brings in new clients and grows existing accounts. Expert at proposals, pitches, and relationship building.",
        tools: ["list_customers", "get_customer", "create_customer", "update_customer_stage", "get_pipeline_summary", "log_customer_interaction", "get_sales_forecast"],
        is_manager: false,
      },
      {
        name: "Kenji",
        role: "Project Manager",
        department: "Project Management",
        persona: "Detail-oriented PM who keeps projects on track, on budget, and on scope. Expert at resource allocation, timelines, and client communication.",
        tools: ["list_projects", "create_project", "create_task", "update_task_status", "list_products", "get_inventory_valuation"],
        is_manager: false,
      },
      {
        name: "Elif",
        role: "Creative Director",
        department: "Creative",
        persona: "Visionary creative leader who sets the bar for design and content quality. Mentors the team and ensures brand consistency for all clients.",
        tools: ["list_documents", "get_document", "send_email", "list_emails"],
        is_manager: false,
      },
    ],
    kpis: ["Billable Hours", "Utilization Rate", "Project Margin", "Client Satisfaction", "Pipeline Value"],
    inventoryCategories: ["Design Assets", "Software Licenses", "Stock Photos", "Templates", "Equipment"],
  },

  consulting: {
    id: "consulting",
    name: "Consulting Firm",
    description: "Professional services firm with client engagements, proposals, and knowledge management",
    icon: "📊",
    color: "from-emerald-600 to-teal-600",
    departments: ["Executive", "Finance", "Business Development", "Delivery", "Research"],
    workers: [
      {
        name: "Sophia",
        role: "Managing Partner",
        department: "Executive",
        persona: "Strategic consulting leader with deep industry expertise. Drives firm strategy, key client relationships, and thought leadership.",
        tools: ["delegate_to_worker", "query_worker", "summarize_department", "list_all_workers"],
        is_manager: true,
      },
      {
        name: "Ayşe",
        role: "Finance Partner",
        department: "Finance",
        persona: "Financial steward managing partner distributions, project economics, and firm profitability. Expert at engagement pricing and cost management.",
        tools: ["get_revenue_summary", "get_expense_summary", "get_profit_loss", "create_invoice", "list_invoices", "record_transaction", "get_cash_flow"],
        is_manager: false,
      },
      {
        name: "Marco",
        role: "BD Director",
        department: "Business Development",
        persona: "Relationship-driven BD leader who builds and maintains client partnerships. Expert at proposals, scoping, and competitive positioning.",
        tools: ["list_customers", "get_customer", "create_customer", "update_customer_stage", "get_pipeline_summary", "log_customer_interaction", "get_sales_forecast"],
        is_manager: false,
      },
      {
        name: "Kenji",
        role: "Delivery Lead",
        department: "Delivery",
        persona: "Hands-on engagement leader who ensures project quality and client satisfaction. Manages resources, timelines, and deliverables.",
        tools: ["list_projects", "create_project", "create_task", "update_task_status", "list_products", "get_product"],
        is_manager: false,
      },
      {
        name: "Elif",
        role: "Knowledge Manager",
        department: "Research",
        persona: "Research and knowledge management expert who maintains the firm's intellectual capital. Creates frameworks, templates, and best practices.",
        tools: ["list_documents", "get_document", "send_email", "list_emails"],
        is_manager: false,
      },
    ],
    kpis: ["Revenue per Partner", "Win Rate", "Average Deal Size", "Utilization Rate", "Client NPS"],
    inventoryCategories: ["Frameworks", "Templates", "Research Reports", "Training Materials", "Tools"],
  },

  manufacturing: {
    id: "manufacturing",
    name: "Manufacturing",
    description: "Production business with inventory, quality control, supply chain, and equipment management",
    icon: "🏭",
    color: "from-gray-600 to-blue-600",
    departments: ["Executive", "Finance", "Sales", "Production", "Quality Control"],
    workers: [
      {
        name: "Sophia",
        role: "Plant Director",
        department: "Executive",
        persona: "Manufacturing leader focused on efficiency, quality, and safety. Balances production targets with cost optimization and team development.",
        tools: ["delegate_to_worker", "query_worker", "summarize_department", "list_all_workers"],
        is_manager: true,
      },
      {
        name: "Ayşe",
        role: "Financial Controller",
        department: "Finance",
        persona: "Manufacturing finance expert tracking COGS, margin analysis, CapEx, and cash flow. Expert at costing models and procurement savings.",
        tools: ["get_revenue_summary", "get_expense_summary", "get_profit_loss", "create_invoice", "list_invoices", "record_transaction", "get_cash_flow"],
        is_manager: false,
      },
      {
        name: "Marco",
        role: "Sales Manager",
        department: "Sales",
        persona: "B2B sales professional managing key accounts, distribution channels, and order fulfillment. Strong at relationship building and forecasting.",
        tools: ["list_customers", "get_customer", "create_customer", "update_customer_stage", "get_pipeline_summary", "log_customer_interaction", "get_sales_forecast"],
        is_manager: false,
      },
      {
        name: "Kenji",
        role: "Production Manager",
        department: "Production",
        persona: "Operations expert managing production schedules, raw materials, equipment maintenance, and workforce planning. Focused on OEE and continuous improvement.",
        tools: ["list_products", "get_product", "update_stock", "create_product", "get_inventory_alerts", "get_inventory_valuation", "list_projects", "create_project", "create_task", "update_task_status"],
        is_manager: false,
      },
      {
        name: "Elif",
        role: "Quality Manager",
        department: "Quality Control",
        persona: "Quality assurance leader ensuring product consistency and compliance. Manages inspections, certifications, and corrective actions.",
        tools: ["list_documents", "get_document", "send_email", "list_emails"],
        is_manager: false,
      },
    ],
    kpis: ["OEE", "Yield Rate", "Lead Time", "Defect Rate", "Inventory Turnover"],
    inventoryCategories: ["Raw Materials", "Work in Progress", "Finished Goods", "Packaging", "Spare Parts"],
  },
};

export function getTemplate(id: string): CompanyTemplate | undefined {
  return COMPANY_TEMPLATES[id];
}

export function getAllTemplates(): CompanyTemplate[] {
  return Object.values(COMPANY_TEMPLATES);
}
