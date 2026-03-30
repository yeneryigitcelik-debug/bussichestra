"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SkeletonRow, SkeletonTable } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Mail,
  Inbox,
  Send,
  MailOpen,
  Search,
  X,
  Paperclip,
  ChevronLeft,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface EmailMessage {
  id: string;
  from_address: string;
  from_name: string | null;
  to_address: string;
  to_name: string | null;
  cc: string | null;
  subject: string;
  body_text: string;
  body_html: string | null;
  direction: "inbound" | "outbound";
  is_read: boolean;
  has_attachments: boolean;
  worker_id: string | null;
  worker_name: string | null;
  created_at: string;
}

interface MailFolder {
  name: string;
  icon: typeof Inbox;
  key: "inbox" | "sent" | "all";
}

// ── Constants ──────────────────────────────────────────────────────────────────

const folders: MailFolder[] = [
  { name: "Inbox", icon: Inbox, key: "inbox" },
  { name: "Sent", icon: Send, key: "sent" },
  { name: "All Mail", icon: MailOpen, key: "all" },
];

const workers = ["Ayse", "Marco", "Kenji", "Elif", "Sophia"];

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatEmailDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Yesterday";
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getPreview(body: string, maxLen = 80): string {
  const clean = body.replace(/\n/g, " ").trim();
  return clean.length > maxLen ? clean.slice(0, maxLen) + "..." : clean;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MailPage() {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<"inbox" | "sent" | "all">(
    "inbox"
  );
  const [activeWorker, setActiveWorker] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  // Compose form
  const [composeFrom, setComposeFrom] = useState(workers[0]);
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchEmails();
  }, []);

  async function fetchEmails() {
    try {
      setLoading(true);
      const res = await fetch("/api/mail");
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails ?? data ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(email: EmailMessage) {
    if (email.is_read) return;
    try {
      await fetch("/api/mail", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: email.id, is_read: true }),
      });
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, is_read: true } : e))
      );
    } catch {
      // silently fail
    }
  }

  async function handleSend() {
    if (!composeTo.trim() || !composeSubject.trim()) return;
    try {
      setSending(true);
      const res = await fetch("/api/mail/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_name: composeFrom,
          to_address: composeTo.trim(),
          cc: composeCc.trim() || null,
          subject: composeSubject.trim(),
          body_text: composeBody.trim(),
        }),
      });
      if (res.ok) {
        setShowCompose(false);
        resetCompose();
        fetchEmails();
      }
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  }

  function resetCompose() {
    setComposeFrom(workers[0]);
    setComposeTo("");
    setComposeCc("");
    setComposeSubject("");
    setComposeBody("");
  }

  function handleSelectEmail(email: EmailMessage) {
    setSelectedEmail(email);
    markAsRead(email);
  }

  // Derived data
  const filtered = emails.filter((e) => {
    if (activeFolder === "inbox" && e.direction !== "inbound") return false;
    if (activeFolder === "sent" && e.direction !== "outbound") return false;
    if (
      activeWorker &&
      e.worker_name?.toLowerCase() !== activeWorker.toLowerCase()
    )
      return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.subject.toLowerCase().includes(q) ||
        (e.from_name && e.from_name.toLowerCase().includes(q)) ||
        e.from_address.toLowerCase().includes(q) ||
        e.body_text.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const unreadCount = emails.filter(
    (e) => !e.is_read && e.direction === "inbound"
  ).length;

  const folderCounts: Record<string, number> = {
    inbox: emails.filter((e) => e.direction === "inbound" && !e.is_read).length,
    sent: 0,
    all: emails.filter((e) => !e.is_read).length,
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Mail</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Worker email communications
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Sidebar ─── */}
        <div className="w-56 shrink-0 border-r border-border bg-card p-4 overflow-y-auto">
          <button
            onClick={() => setShowCompose(true)}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Mail className="h-4 w-4" />
            Compose
          </button>

          {/* Folders */}
          <nav className="space-y-1">
            {folders.map((folder) => (
              <button
                key={folder.key}
                onClick={() => {
                  setActiveFolder(folder.key);
                  setSelectedEmail(null);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                  activeFolder === folder.key
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-3">
                  <folder.icon className="h-4 w-4" />
                  {folder.name}
                </span>
                {folderCounts[folder.key] > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {folderCounts[folder.key]}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Workers */}
          <div className="mt-6">
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
              Workers
            </h3>
            {workers.map((name) => (
              <button
                key={name}
                onClick={() => {
                  setActiveWorker(activeWorker === name ? null : name);
                  setSelectedEmail(null);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  activeWorker === name
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Email List ─── */}
        <div
          className={cn(
            "flex-1 overflow-hidden flex flex-col border-r border-border",
            selectedEmail ? "hidden md:flex md:max-w-md lg:max-w-lg" : ""
          )}
        >
          {/* Search */}
          <div className="border-b border-border p-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search emails..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div>
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="No emails"
                description={
                  search || activeWorker
                    ? "Try adjusting your search or filter."
                    : "No emails in this folder yet."
                }
              />
            ) : (
              filtered.map((email) => (
                <div
                  key={email.id}
                  onClick={() => handleSelectEmail(email)}
                  className={cn(
                    "flex cursor-pointer items-start gap-4 border-b border-border px-5 py-4 transition-colors hover:bg-secondary/50",
                    !email.is_read && "bg-secondary/30",
                    selectedEmail?.id === email.id && "bg-secondary/60"
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                    {(email.from_name ?? email.from_address)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-sm truncate",
                          !email.is_read
                            ? "font-semibold"
                            : "font-medium text-muted-foreground"
                        )}
                      >
                        {email.direction === "outbound"
                          ? `To: ${email.to_name ?? email.to_address}`
                          : email.from_name ?? email.from_address}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground ml-2">
                        {formatEmailDate(email.created_at)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "text-sm truncate",
                        !email.is_read
                          ? "font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {email.subject}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="truncate text-xs text-muted-foreground flex-1">
                        {getPreview(email.body_text)}
                      </p>
                      {email.has_attachments && (
                        <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── Detail Panel ─── */}
        {selectedEmail ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Detail header */}
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
              <button
                onClick={() => setSelectedEmail(null)}
                className="md:hidden text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold truncate">
                  {selectedEmail.subject}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {formatFullDate(selectedEmail.created_at)}
                </p>
              </div>
            </div>

            {/* Detail body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mx-auto max-w-2xl space-y-4">
                {/* From / To */}
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium">
                    {(
                      selectedEmail.from_name ?? selectedEmail.from_address
                    )[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {selectedEmail.from_name ?? selectedEmail.from_address}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedEmail.from_address}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      To:{" "}
                      {selectedEmail.to_name ?? selectedEmail.to_address}
                      {selectedEmail.cc && (
                        <span> &middot; CC: {selectedEmail.cc}</span>
                      )}
                    </p>
                    {selectedEmail.worker_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Worker:{" "}
                        <span className="text-foreground">
                          {selectedEmail.worker_name}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Separator */}
                <div className="border-b border-border" />

                {/* Body */}
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {selectedEmail.body_text}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="text-center">
              <Mail className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Select an email to read
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Compose Dialog ─── */}
      {showCompose && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowCompose(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Compose Email</h2>
              <button
                onClick={() => setShowCompose(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* From worker */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">From</label>
                <select
                  value={composeFrom}
                  onChange={(e) => setComposeFrom(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {workers.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              {/* To */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">To</label>
                <input
                  type="text"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* CC */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  CC{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  value={composeCc}
                  onChange={(e) => setComposeCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Subject
                </label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Email subject..."
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Body */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Message
                </label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={6}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCompose(false);
                  resetCompose();
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!composeTo.trim() || !composeSubject.trim() || sending}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {sending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
