"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Register user via API
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, companyName }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create account");
        return;
      }

      // 2. Auto sign in
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but login failed. Please sign in manually.");
        return;
      }

      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 ring-1 ring-white/10">
            <span className="text-xl font-bold text-white">O</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold">Create your workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up your AI-powered business operating system
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium">Your name</label>
            <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Yigit" />
          </div>

          <div>
            <label htmlFor="companyName" className="mb-1.5 block text-sm font-medium">Company name</label>
            <input id="companyName" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Acme Inc" />
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Work email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@company.com" />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Min 6 characters" />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create workspace
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
