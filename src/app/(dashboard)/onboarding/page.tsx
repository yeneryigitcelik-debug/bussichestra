"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAllTemplates, type CompanyTemplate } from "@/lib/company-templates";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, ChevronLeft, Loader2, Building2, Users, Rocket } from "lucide-react";
import { WorkerAvatar } from "@/components/workers/WorkerAvatar";

const templates = getAllTemplates();

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<CompanyTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinish = async () => {
    if (!companyName.trim() || !selectedTemplate) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          templateId: selectedTemplate.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Setup failed");
      }

      // Seed demo data
      await fetch("/api/seed", { method: "POST" }).catch(() => {});

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[0, 1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all",
                step > s ? "bg-primary text-primary-foreground" :
                step === s ? "bg-primary/20 text-primary ring-2 ring-primary" :
                "bg-secondary text-muted-foreground"
              )}>
                {step > s ? <Check className="h-4 w-4" /> : s + 1}
              </div>
              {s < 2 && <div className={cn("h-0.5 w-12", step > s ? "bg-primary" : "bg-secondary")} />}
            </div>
          ))}
        </div>

        {/* Step 0: Company Name */}
        {step === 0 && (
          <div className="animate-fade-in-up text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="mb-2 text-2xl font-bold">Welcome to OrchestraOS</h1>
            <p className="mb-8 text-muted-foreground">Let&apos;s set up your virtual company. What&apos;s the name of your business?</p>

            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Corporation"
              className="mb-6 w-full max-w-md rounded-xl border border-border bg-card px-4 py-3 text-center text-lg font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />

            <div>
              <button
                onClick={() => setStep(1)}
                disabled={!companyName.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Industry Selection */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <div className="mb-6 text-center">
              <h1 className="mb-2 text-2xl font-bold">Choose Your Industry</h1>
              <p className="text-muted-foreground">This customizes your AI team, KPIs, and tools for your business type</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all hover:bg-secondary/50",
                    selectedTemplate?.id === t.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : "border-border"
                  )}
                >
                  <span className="text-3xl">{t.icon}</span>
                  <span className="text-sm font-semibold">{t.name}</span>
                  <span className="text-[11px] text-muted-foreground text-center line-clamp-2">{t.description}</span>
                </button>
              ))}
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(0)}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!selectedTemplate}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review Team */}
        {step === 2 && selectedTemplate && (
          <div className="animate-fade-in-up">
            <div className="mb-6 text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h1 className="mb-2 text-2xl font-bold">Your AI Team</h1>
              <p className="text-muted-foreground">
                Here&apos;s the team we&apos;ll create for <span className="font-semibold text-foreground">{companyName}</span>
              </p>
            </div>

            <div className="space-y-3">
              {selectedTemplate.workers.map((w) => (
                <div key={w.name} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                  <WorkerAvatar workerId={w.name.toLowerCase()} size="lg" showStatus={false} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{w.name}</span>
                      {w.is_manager && (
                        <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-400">
                          Manager
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{w.role} · {w.department}</p>
                    <p className="mt-1 text-xs text-muted-foreground/70 line-clamp-1">{w.persona}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{w.tools.length} tools</span>
                </div>
              ))}
            </div>

            {/* KPIs Preview */}
            <div className="mt-6 rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Key Metrics for {selectedTemplate.name}</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.kpis.map((kpi) => (
                  <span key={kpi} className="rounded-lg bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                    {kpi}
                  </span>
                ))}
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={handleFinish}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Setting up...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" /> Launch {companyName}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
