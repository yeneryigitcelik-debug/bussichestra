"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, User, Bell, Shield, Palette, CreditCard, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/hooks/useSupabase";

const tabs = [
  { id: "general", label: "General", icon: Building2 },
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "billing", label: "Billing", icon: CreditCard },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const { user } = useSupabase();

  // General tab state
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("saas");
  const [currency, setCurrency] = useState("USD");

  // Profile tab state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // Security tab state
  const [newPassword, setNewPassword] = useState("");

  // Appearance state
  const [theme, setTheme] = useState("Dark");
  const [language, setLanguage] = useState("English");

  // UI state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const [orgRes, profileRes] = await Promise.all([
        fetch("/api/settings/organization"),
        fetch("/api/settings/profile"),
      ]);

      if (orgRes.ok) {
        const org = await orgRes.json();
        setCompanyName(org.name || "");
        const settings = org.settings as Record<string, string> | null;
        setIndustry(settings?.industry || "saas");
        setCurrency(settings?.currency || "USD");
        if (settings?.language) setLanguage(settings.language);
      }

      if (profileRes.ok) {
        const profile = await profileRes.json();
        setFullName(profile.full_name || "");
        setEmail(profile.email || user?.email || "");
      }
    } catch {
      // Use defaults
      setEmail(user?.email || "");
      setFullName(user?.user_metadata?.full_name || "");
    }
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveGeneral = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName,
          settings: { industry, currency },
        }),
      });
      showSaved();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName }),
      });
      showSaved();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const updatePassword = async () => {
    if (!newPassword || newPassword.length < 6) return;
    setSaving(true);
    try {
      // Password update via API
      await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      setNewPassword("");
      showSaved();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const saveAppearance = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { language, theme: theme.toLowerCase() },
        }),
      });
      showSaved();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const SaveButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      disabled={saving}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
      {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
    </button>
  );

  return (
    <div className="flex h-screen flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your workspace</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-56 shrink-0 border-r border-border bg-card p-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-2xl space-y-8">
            {activeTab === "general" && (
              <>
                <div>
                  <h2 className="text-lg font-semibold">Organization</h2>
                  <p className="text-sm text-muted-foreground">Manage your company information</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Company name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Industry</label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="saas">SaaS Company</option>
                      <option value="ecommerce">E-Commerce</option>
                      <option value="restaurant">Restaurant / F&B</option>
                      <option value="agency">Agency / Studio</option>
                      <option value="consulting">Consulting Firm</option>
                      <option value="manufacturing">Manufacturing</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Default currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="TRY">TRY (₺)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>
                <SaveButton onClick={saveGeneral} />
              </>
            )}

            {activeTab === "profile" && (
              <>
                <div>
                  <h2 className="text-lg font-semibold">Profile</h2>
                  <p className="text-sm text-muted-foreground">Your personal information</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 ring-1 ring-white/10 text-xl font-semibold text-purple-300">
                      {fullName?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-medium">{fullName || "CEO"}</p>
                      <p className="text-sm text-muted-foreground">{email}</p>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Full name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Email</label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm text-muted-foreground"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Email changes are not supported yet</p>
                  </div>
                </div>
                <SaveButton onClick={saveProfile} />
              </>
            )}

            {activeTab === "notifications" && (
              <>
                <div>
                  <h2 className="text-lg font-semibold">Notifications</h2>
                  <p className="text-sm text-muted-foreground">Choose what you want to be notified about</p>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Worker messages", desc: "When a worker sends you a message", defaultChecked: true },
                    { label: "Task completions", desc: "When a worker completes a task", defaultChecked: true },
                    { label: "Invoice payments", desc: "When an invoice is paid", defaultChecked: true },
                    { label: "Low stock alerts", desc: "When inventory falls below reorder point", defaultChecked: true },
                    { label: "New customers", desc: "When a new lead is created", defaultChecked: false },
                    { label: "Worker issues", desc: "When a worker gets stuck", defaultChecked: true },
                    { label: "Approval requests", desc: "When a worker needs your approval", defaultChecked: true },
                  ].map((item) => (
                    <label key={item.label} className="flex items-center justify-between rounded-lg border border-border p-4 cursor-pointer hover:bg-secondary/30 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <input type="checkbox" defaultChecked={item.defaultChecked} className="h-4 w-4 rounded accent-primary" />
                    </label>
                  ))}
                </div>
              </>
            )}

            {activeTab === "security" && (
              <>
                <div>
                  <h2 className="text-lg font-semibold">Security</h2>
                  <p className="text-sm text-muted-foreground">Manage your account security</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">New password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <SaveButton onClick={updatePassword} />
                </div>
              </>
            )}

            {activeTab === "appearance" && (
              <>
                <div>
                  <h2 className="text-lg font-semibold">Appearance</h2>
                  <p className="text-sm text-muted-foreground">Customize your workspace look</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Theme</label>
                    <div className="flex gap-3">
                      {["Dark", "Light", "System"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={cn(
                            "rounded-lg border px-4 py-2 text-sm transition-colors",
                            theme === t ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Worker language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option>English</option>
                      <option>Turkish</option>
                      <option>Spanish</option>
                      <option>German</option>
                      <option>French</option>
                      <option>Japanese</option>
                    </select>
                  </div>
                </div>
                <SaveButton onClick={saveAppearance} />
              </>
            )}

            {activeTab === "billing" && (
              <>
                <div>
                  <h2 className="text-lg font-semibold">Billing</h2>
                  <p className="text-sm text-muted-foreground">Manage your subscription</p>
                </div>
                <div className="rounded-xl border border-border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Starter Plan</h3>
                      <p className="text-sm text-muted-foreground">5 AI workers, 1,000 messages/month</p>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400 border border-emerald-500/20">Current</span>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-shadow">
                      Upgrade to Business
                    </button>
                    <button className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary transition-colors">
                      View usage
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Plans</h3>
                  {[
                    { name: "Starter", price: "$29/mo", features: "5 workers, 1K msgs, basic tools", current: true },
                    { name: "Business", price: "$99/mo", features: "15 workers, 10K msgs, all tools, email integration", current: false },
                    { name: "Enterprise", price: "Custom", features: "Unlimited workers, unlimited msgs, custom tools, API access", current: false },
                  ].map((plan) => (
                    <div key={plan.name} className={cn(
                      "flex items-center justify-between rounded-lg border p-4",
                      plan.current ? "border-primary/30 bg-primary/5" : "border-border"
                    )}>
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">{plan.features}</p>
                      </div>
                      <span className="text-sm font-semibold">{plan.price}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
