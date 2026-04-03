"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SkeletonCard, SkeletonTable } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  FileText,
  Upload,
  LayoutGrid,
  List,
  Search,
  FolderOpen,
  FileCheck,
  FilePen,
  FileBarChart,
  Shield,
  FileCode,
  File,
  X,
  ChevronRight,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Document {
  id: string;
  name: string;
  type: "contract" | "proposal" | "report" | "policy" | "template" | "other";
  description: string | null;
  folder: string | null;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy: string | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const typeFilters = [
  "all",
  "contract",
  "proposal",
  "report",
  "policy",
  "template",
] as const;

const typeConfig: Record<
  string,
  { icon: typeof FileText; color: string; bg: string; border: string }
> = {
  contract: {
    icon: FileCheck,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  proposal: {
    icon: FilePen,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  report: {
    icon: FileBarChart,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  policy: {
    icon: Shield,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  template: {
    icon: FileCode,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
  other: {
    icon: File,
    color: "text-gray-400",
    bg: "bg-gray-500/10",
    border: "border-gray-500/20",
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  // Upload form
  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState<string>("other");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFolder, setUploadFolder] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      setLoading(true);
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents ?? data ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!uploadName.trim()) return;
    try {
      setUploading(true);
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uploadName.trim(),
          type: uploadType,
          description: uploadDescription.trim() || null,
          folder: uploadFolder.trim() || null,
        }),
      });
      if (res.ok) {
        setShowUpload(false);
        setUploadName("");
        setUploadType("other");
        setUploadDescription("");
        setUploadFolder("");
        fetchDocuments();
      }
    } catch {
      // silently fail
    } finally {
      setUploading(false);
    }
  }

  // Derived data
  const folders = Array.from(
    new Set(documents.map((d) => d.folder).filter(Boolean))
  ) as string[];

  const filtered = documents.filter((d) => {
    if (activeFilter !== "all" && d.type !== activeFilter) return false;
    if (activeFolder && d.folder !== activeFolder) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Manage your company documents and files
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Folder sidebar */}
        {folders.length > 0 && (
          <div className="w-52 shrink-0 border-r border-border bg-card p-4 overflow-y-auto">
            <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
              Folders
            </h3>
            <button
              onClick={() => setActiveFolder(null)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                !activeFolder
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <FolderOpen className="h-4 w-4" />
              All Files
            </button>
            {folders.map((folder) => (
              <button
                key={folder}
                onClick={() =>
                  setActiveFolder(activeFolder === folder ? null : folder)
                }
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  activeFolder === folder
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <FolderOpen className="h-4 w-4" />
                {folder}
              </button>
            ))}
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-sm text-muted-foreground mr-auto">
              <span className="cursor-pointer hover:text-foreground" onClick={() => setActiveFolder(null)}>
                Documents
              </span>
              {activeFolder && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-foreground">{activeFolder}</span>
                </>
              )}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-40 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            {/* View toggle */}
            <div className="flex rounded-lg border border-border">
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "p-1.5 transition-colors",
                  view === "grid"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "p-1.5 transition-colors",
                  view === "list"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Type filter tabs */}
          <div className="flex gap-1 border-b border-border px-6 py-2">
            {typeFilters.map((t) => (
              <button
                key={t}
                onClick={() => setActiveFilter(t)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  activeFilter === t
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              view === "grid" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : (
                <SkeletonTable rows={6} cols={5} />
              )
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No documents found"
                description={
                  search || activeFilter !== "all" || activeFolder
                    ? "Try adjusting your filters or search query."
                    : "Upload your first document to get started."
                }
                action={
                  !search && activeFilter === "all" && !activeFolder
                    ? { label: "Upload Document", onClick: () => setShowUpload(true) }
                    : undefined
                }
              />
            ) : view === "grid" ? (
              /* ─── Grid View ─── */
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((doc) => {
                  const cfg = typeConfig[doc.type] ?? typeConfig.other;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={doc.id}
                      className="group cursor-pointer rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg",
                            cfg.bg
                          )}
                        >
                          <Icon className={cn("h-5 w-5", cfg.color)} />
                        </div>
                        <span
                          className={cn(
                            "inline-block rounded-md border px-2 py-0.5 text-xs capitalize",
                            cfg.bg,
                            cfg.color,
                            cfg.border
                          )}
                        >
                          {doc.type}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium truncate">
                        {doc.name}
                      </p>
                      {doc.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>{formatDate(doc.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ─── List View ─── */
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 font-medium">Size</th>
                      <th className="px-5 py-3 font-medium">Folder</th>
                      <th className="px-5 py-3 text-right font-medium">
                        Uploaded
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((doc) => {
                      const cfg = typeConfig[doc.type] ?? typeConfig.other;
                      const Icon = cfg.icon;
                      return (
                        <tr
                          key={doc.id}
                          className="cursor-pointer border-b border-border/50 last:border-b-0 transition-colors hover:bg-secondary/30"
                        >
                          <td className="px-5 py-3 text-sm">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                  cfg.bg
                                )}
                              >
                                <Icon
                                  className={cn("h-4 w-4", cfg.color)}
                                />
                              </div>
                              <span className="font-medium truncate max-w-xs">
                                {doc.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm">
                            <span
                              className={cn(
                                "inline-block rounded-md border px-2 py-0.5 text-xs capitalize",
                                cfg.bg,
                                cfg.color,
                                cfg.border
                              )}
                            >
                              {doc.type}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-sm text-muted-foreground">
                            {formatFileSize(doc.fileSize)}
                          </td>
                          <td className="px-5 py-3 text-sm text-muted-foreground">
                            {doc.folder ?? "--"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-right text-sm text-muted-foreground">
                            {formatDate(doc.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Upload Dialog ─── */}
      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowUpload(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Upload Document</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Document Name
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. Q1 Financial Report"
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Type */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">Type</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="contract">Contract</option>
                  <option value="proposal">Proposal</option>
                  <option value="report">Report</option>
                  <option value="policy">Policy</option>
                  <option value="template">Template</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Brief description of the document..."
                  rows={3}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Folder */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Folder <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  placeholder="e.g. Finance, Legal, Operations"
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowUpload(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadName.trim() || uploading}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {uploading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
