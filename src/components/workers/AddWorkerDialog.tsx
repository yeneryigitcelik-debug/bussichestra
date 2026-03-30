"use client";

import { useState } from "react";
import { X, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AI_MODELS, DEPARTMENTS } from "@/lib/constants";

interface AddWorkerDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const PERSONA_TEMPLATES: Record<string, string> = {
  professional: "Professional, precise, and data-driven. Communicates clearly with a focus on accuracy and efficiency.",
  friendly: "Warm, approachable, and supportive. Makes complex topics accessible and enjoys celebrating wins with the team.",
  strategic: "Big-picture thinker with sharp analytical skills. Always connects details to broader business strategy.",
  creative: "Innovative and resourceful. Brings fresh perspectives and thinks outside the box to solve problems.",
};

export function AddWorkerDialog({ open, onClose, onCreated }: AddWorkerDialogProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("Finance");
  const [persona, setPersona] = useState("");
  const [model, setModel] = useState<string>(AI_MODELS.WORKER);
  const [temperature, setTemperature] = useState(0.7);
  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const builtPersona = `You are ${name}, the ${role} at this company. ${persona}`;

      const res = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role,
          persona: builtPersona,
          model,
          temperature,
          is_manager: isManager,
          tools: [],
          settings: { department_name: department },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create worker");
      }

      onCreated();
      onClose();
      // Reset form
      setName(""); setRole(""); setPersona(""); setIsManager(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold">Hire New AI Worker</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto p-6">
          <div className="space-y-5">
            {/* Name + Role */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Alex"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Role / Title</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  placeholder="e.g. Marketing Director"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.values(DEPARTMENTS).map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Persona */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Personality & Behavior</label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {Object.entries(PERSONA_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPersona(template)}
                    className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    {key}
                  </button>
                ))}
              </div>
              <textarea
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                required
                rows={4}
                placeholder="Describe this worker's personality, communication style, and approach to work..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Model + Temperature */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">AI Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value={AI_MODELS.WORKER}>Sonnet (Fast, efficient)</option>
                  <option value={AI_MODELS.MANAGER}>Opus (Powerful, strategic)</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Creativity: {temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="mt-2 w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>
            </div>

            {/* Manager toggle */}
            <label className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Manager role</p>
                <p className="text-xs text-muted-foreground">Can delegate tasks to other workers</p>
              </div>
              <button
                type="button"
                onClick={() => setIsManager(!isManager)}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  isManager ? "bg-primary" : "bg-secondary"
                )}
              >
                <span
                  className={cn(
                    "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                    isManager && "translate-x-5"
                  )}
                />
              </button>
            </label>

            {error && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name || !role || !persona}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Hire Worker
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
