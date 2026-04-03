// ============================================================
// Industry-Specific Pipeline Stages
// ============================================================
// Each industry has custom CRM pipeline stages that reflect
// how that business actually converts leads to customers.

export interface PipelineStage {
  id: string;
  label: string;
  color: string;
  description: string;
}

export const PIPELINE_CONFIGS: Record<string, PipelineStage[]> = {
  // Default (SaaS, generic)
  default: [
    { id: "lead", label: "Lead", color: "bg-gray-500", description: "New lead, not yet qualified" },
    { id: "prospect", label: "Prospect", color: "bg-blue-500", description: "Qualified, showing interest" },
    { id: "customer", label: "Customer", color: "bg-emerald-500", description: "Active paying customer" },
    { id: "churned", label: "Churned", color: "bg-red-500", description: "No longer active" },
  ],

  saas: [
    { id: "lead", label: "Lead", color: "bg-gray-500", description: "Signed up or inbound" },
    { id: "trial", label: "Trial", color: "bg-blue-500", description: "On free trial" },
    { id: "prospect", label: "Qualified", color: "bg-yellow-500", description: "Sales qualified, demo done" },
    { id: "negotiation", label: "Negotiation", color: "bg-purple-500", description: "Pricing/contract discussion" },
    { id: "customer", label: "Customer", color: "bg-emerald-500", description: "Active subscriber" },
    { id: "churned", label: "Churned", color: "bg-red-500", description: "Cancelled subscription" },
  ],

  insurance: [
    { id: "lead", label: "Inquiry", color: "bg-gray-500", description: "Initial inquiry received" },
    { id: "quote", label: "Quote Sent", color: "bg-blue-500", description: "Quote/premium calculated and sent" },
    { id: "prospect", label: "Proposal", color: "bg-yellow-500", description: "Formal proposal under review" },
    { id: "underwriting", label: "Underwriting", color: "bg-purple-500", description: "Risk assessment in progress" },
    { id: "customer", label: "Policy Active", color: "bg-emerald-500", description: "Policy issued and active" },
    { id: "renewal", label: "Renewal", color: "bg-orange-500", description: "Policy up for renewal" },
    { id: "churned", label: "Lapsed", color: "bg-red-500", description: "Policy not renewed" },
  ],

  realestate: [
    { id: "lead", label: "Inquiry", color: "bg-gray-500", description: "New property inquiry" },
    { id: "viewing", label: "Viewing", color: "bg-blue-500", description: "Property viewing scheduled/done" },
    { id: "prospect", label: "Interested", color: "bg-yellow-500", description: "Expressed interest, negotiating" },
    { id: "offer", label: "Offer Made", color: "bg-purple-500", description: "Offer submitted" },
    { id: "closing", label: "Closing", color: "bg-orange-500", description: "Contracts and closing process" },
    { id: "customer", label: "Closed", color: "bg-emerald-500", description: "Deal completed" },
    { id: "churned", label: "Lost", color: "bg-red-500", description: "Deal fell through" },
  ],

  healthcare: [
    { id: "lead", label: "Inquiry", color: "bg-gray-500", description: "New patient inquiry" },
    { id: "prospect", label: "Registered", color: "bg-blue-500", description: "Patient registered" },
    { id: "appointment", label: "Appointment", color: "bg-yellow-500", description: "Appointment scheduled" },
    { id: "customer", label: "Active Patient", color: "bg-emerald-500", description: "Active patient with visits" },
    { id: "follow_up", label: "Follow-up", color: "bg-purple-500", description: "Needs follow-up care" },
    { id: "churned", label: "Inactive", color: "bg-red-500", description: "No visits in 12+ months" },
  ],

  logistics: [
    { id: "lead", label: "Inquiry", color: "bg-gray-500", description: "Shipping/logistics inquiry" },
    { id: "prospect", label: "Quote Sent", color: "bg-blue-500", description: "Rate quote provided" },
    { id: "negotiation", label: "Negotiation", color: "bg-yellow-500", description: "Contract negotiation" },
    { id: "customer", label: "Active Client", color: "bg-emerald-500", description: "Ongoing shipping contract" },
    { id: "churned", label: "Lost", color: "bg-red-500", description: "Contract ended" },
  ],

  lawfirm: [
    { id: "lead", label: "Consultation", color: "bg-gray-500", description: "Initial consultation request" },
    { id: "prospect", label: "Engaged", color: "bg-blue-500", description: "Engagement letter signed" },
    { id: "active_case", label: "Active Case", color: "bg-yellow-500", description: "Case in progress" },
    { id: "customer", label: "Resolved", color: "bg-emerald-500", description: "Case completed" },
    { id: "churned", label: "Withdrawn", color: "bg-red-500", description: "Client withdrew or lost" },
  ],

  accounting: [
    { id: "lead", label: "Inquiry", color: "bg-gray-500", description: "Initial inquiry" },
    { id: "prospect", label: "Proposal", color: "bg-blue-500", description: "Engagement proposal sent" },
    { id: "onboarding", label: "Onboarding", color: "bg-yellow-500", description: "Client onboarding" },
    { id: "customer", label: "Active Client", color: "bg-emerald-500", description: "Ongoing client" },
    { id: "churned", label: "Former Client", color: "bg-red-500", description: "Engagement ended" },
  ],

  ecommerce: [
    { id: "lead", label: "Visitor", color: "bg-gray-500", description: "Browsing/cart activity" },
    { id: "prospect", label: "Cart", color: "bg-blue-500", description: "Items in cart" },
    { id: "customer", label: "Customer", color: "bg-emerald-500", description: "Completed purchase" },
    { id: "repeat", label: "Repeat", color: "bg-purple-500", description: "Multiple purchases" },
    { id: "churned", label: "Inactive", color: "bg-red-500", description: "No activity 90+ days" },
  ],

  restaurant: [
    { id: "lead", label: "Walk-in", color: "bg-gray-500", description: "First visit" },
    { id: "prospect", label: "Repeat", color: "bg-blue-500", description: "Returned 2+ times" },
    { id: "customer", label: "Regular", color: "bg-emerald-500", description: "Weekly+ visitor" },
    { id: "vip", label: "VIP", color: "bg-purple-500", description: "High-value regular" },
    { id: "churned", label: "Lost", color: "bg-red-500", description: "Hasn't visited in 60+ days" },
  ],

  agency: [
    { id: "lead", label: "Inquiry", color: "bg-gray-500", description: "Creative brief received" },
    { id: "prospect", label: "Pitch", color: "bg-blue-500", description: "Pitch/proposal stage" },
    { id: "negotiation", label: "Negotiation", color: "bg-yellow-500", description: "Scope/budget discussion" },
    { id: "customer", label: "Active Client", color: "bg-emerald-500", description: "Project in progress" },
    { id: "retainer", label: "Retainer", color: "bg-purple-500", description: "Ongoing retainer" },
    { id: "churned", label: "Former Client", color: "bg-red-500", description: "Engagement ended" },
  ],

  consulting: [
    { id: "lead", label: "Lead", color: "bg-gray-500", description: "Initial contact" },
    { id: "prospect", label: "Discovery", color: "bg-blue-500", description: "Discovery meeting done" },
    { id: "proposal", label: "Proposal", color: "bg-yellow-500", description: "Proposal submitted" },
    { id: "customer", label: "Engagement", color: "bg-emerald-500", description: "Active engagement" },
    { id: "churned", label: "Lost", color: "bg-red-500", description: "Did not proceed" },
  ],

  manufacturing: [
    { id: "lead", label: "Inquiry", color: "bg-gray-500", description: "Product inquiry" },
    { id: "prospect", label: "Sample", color: "bg-blue-500", description: "Sample/prototype sent" },
    { id: "negotiation", label: "Negotiation", color: "bg-yellow-500", description: "Pricing negotiation" },
    { id: "customer", label: "Active Buyer", color: "bg-emerald-500", description: "Regular orders" },
    { id: "churned", label: "Lost", color: "bg-red-500", description: "No orders 90+ days" },
  ],

  education: [
    { id: "lead", label: "Inquiry", color: "bg-gray-500", description: "Course inquiry" },
    { id: "prospect", label: "Applied", color: "bg-blue-500", description: "Application submitted" },
    { id: "enrolled", label: "Enrolled", color: "bg-yellow-500", description: "Enrollment confirmed" },
    { id: "customer", label: "Active Student", color: "bg-emerald-500", description: "Currently studying" },
    { id: "graduated", label: "Graduated", color: "bg-purple-500", description: "Completed program" },
    { id: "churned", label: "Dropped Out", color: "bg-red-500", description: "Left before completion" },
  ],

  fitness: [
    { id: "lead", label: "Trial", color: "bg-gray-500", description: "Free trial/day pass" },
    { id: "prospect", label: "Tour Done", color: "bg-blue-500", description: "Facility tour completed" },
    { id: "customer", label: "Member", color: "bg-emerald-500", description: "Active membership" },
    { id: "premium", label: "Premium", color: "bg-purple-500", description: "Premium/PT member" },
    { id: "churned", label: "Cancelled", color: "bg-red-500", description: "Membership cancelled" },
  ],

  automotive: [
    { id: "lead", label: "Inquiry", color: "bg-gray-500", description: "Vehicle inquiry" },
    { id: "test_drive", label: "Test Drive", color: "bg-blue-500", description: "Test drive scheduled/done" },
    { id: "prospect", label: "Negotiation", color: "bg-yellow-500", description: "Price negotiation" },
    { id: "financing", label: "Financing", color: "bg-purple-500", description: "Finance approval" },
    { id: "customer", label: "Sold", color: "bg-emerald-500", description: "Vehicle delivered" },
    { id: "service", label: "Service", color: "bg-orange-500", description: "Service customer" },
    { id: "churned", label: "Lost", color: "bg-red-500", description: "Went elsewhere" },
  ],

  construction: [
    { id: "lead", label: "Inquiry", color: "bg-gray-500", description: "Project inquiry" },
    { id: "prospect", label: "Bid", color: "bg-blue-500", description: "Bid submitted" },
    { id: "negotiation", label: "Negotiation", color: "bg-yellow-500", description: "Contract negotiation" },
    { id: "customer", label: "Under Contract", color: "bg-emerald-500", description: "Active project" },
    { id: "completed", label: "Completed", color: "bg-purple-500", description: "Project delivered" },
    { id: "churned", label: "Lost Bid", color: "bg-red-500", description: "Bid not accepted" },
  ],

  pharmacy: [
    { id: "lead", label: "Walk-in", color: "bg-gray-500", description: "First visit" },
    { id: "prospect", label: "Prescription", color: "bg-blue-500", description: "Has prescriptions on file" },
    { id: "customer", label: "Regular", color: "bg-emerald-500", description: "Monthly prescriptions" },
    { id: "churned", label: "Transferred", color: "bg-red-500", description: "Transferred to another pharmacy" },
  ],

  travel: [
    { id: "lead", label: "Inquiry", color: "bg-gray-500", description: "Travel inquiry" },
    { id: "prospect", label: "Itinerary Sent", color: "bg-blue-500", description: "Options/itinerary provided" },
    { id: "booking", label: "Booking", color: "bg-yellow-500", description: "Booking in progress" },
    { id: "customer", label: "Confirmed", color: "bg-emerald-500", description: "Trip booked and paid" },
    { id: "traveling", label: "Traveling", color: "bg-purple-500", description: "Currently on trip" },
    { id: "churned", label: "Cancelled", color: "bg-red-500", description: "Trip cancelled" },
  ],
};

export function getPipelineStages(industry: string): PipelineStage[] {
  return PIPELINE_CONFIGS[industry] || PIPELINE_CONFIGS.default;
}

export function getAllIndustries(): string[] {
  return Object.keys(PIPELINE_CONFIGS).filter((k) => k !== "default");
}
