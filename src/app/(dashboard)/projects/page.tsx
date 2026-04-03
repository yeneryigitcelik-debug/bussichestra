"use client";

import { useState, useEffect, useCallback } from "react";
import { FolderKanban, Plus, CheckCircle2, Clock, ListTodo, X, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SkeletonCard } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";

// --- Types ---

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  total_tasks: number;
  completed_tasks: number;
}

interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedWorkerId: string | null;
  dueDate: string | null;
}

// --- Badge helpers ---

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  planning:   { bg: "bg-gray-500/10 border-gray-500/30",   text: "text-gray-400",    label: "Planning" },
  active:     { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400", label: "Active" },
  on_hold:    { bg: "bg-yellow-500/10 border-yellow-500/30", text: "text-yellow-400",  label: "On Hold" },
  completed:  { bg: "bg-blue-500/10 border-blue-500/30",   text: "text-blue-400",    label: "Completed" },
  cancelled:  { bg: "bg-red-500/10 border-red-500/30",     text: "text-red-400",     label: "Cancelled" },
};

const priorityBadge: Record<string, { bg: string; text: string; label: string }> = {
  low:    { bg: "bg-gray-500/10 border-gray-500/30",   text: "text-gray-400",   label: "Low" },
  medium: { bg: "bg-blue-500/10 border-blue-500/30",   text: "text-blue-400",   label: "Medium" },
  high:   { bg: "bg-orange-500/10 border-orange-500/30", text: "text-orange-400", label: "High" },
  urgent: { bg: "bg-red-500/10 border-red-500/30",     text: "text-red-400",    label: "Urgent" },
};

const taskStatusBadge: Record<string, { bg: string; text: string; label: string }> = {
  todo:        { bg: "bg-gray-500/10 border-gray-500/30",    text: "text-gray-400",    label: "To Do" },
  in_progress: { bg: "bg-blue-500/10 border-blue-500/30",    text: "text-blue-400",    label: "In Progress" },
  review:      { bg: "bg-yellow-500/10 border-yellow-500/30", text: "text-yellow-400",  label: "Review" },
  done:        { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400", label: "Done" },
  blocked:     { bg: "bg-red-500/10 border-red-500/30",      text: "text-red-400",     label: "Blocked" },
};

function Badge({ config }: { config: { bg: string; text: string; label: string } | undefined }) {
  if (!config) return null;
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", config.bg, config.text)}>
      {config.label}
    </span>
  );
}

// --- Filter tabs ---

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
];

// --- Component ---

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Expanded project + its tasks
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Add task dialog
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", status: "todo", priority: "medium" });
  const [savingTask, setSavingTask] = useState(false);

  // Create project form
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "planning",
    priority: "medium",
    due_date: "",
  });

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setProjects(json.projects ?? []);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Fetch tasks when a project is expanded
  async function fetchTasks(projectId: string) {
    setTasksLoading(true);
    try {
      const res = await fetch(`/api/projects/tasks?project_id=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      setTasks(json.tasks ?? []);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }

  function toggleExpand(projectId: string) {
    if (expandedId === projectId) {
      setExpandedId(null);
      setTasks([]);
      setShowAddTask(false);
    } else {
      setExpandedId(projectId);
      setShowAddTask(false);
      fetchTasks(projectId);
    }
  }

  // Computed stats
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const totalTasks = projects.reduce((sum, p) => sum + p.total_tasks, 0);
  const completedTasks = projects.reduce((sum, p) => sum + p.completed_tasks, 0);

  const filteredProjects =
    statusFilter === "all"
      ? projects
      : projects.filter((p) => p.status === statusFilter);

  // Handlers
  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          status: form.status,
          priority: form.priority,
          due_date: form.due_date || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      setShowCreateDialog(false);
      setForm({ name: "", description: "", status: "planning", priority: "medium", due_date: "" });
      await fetchProjects();
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!expandedId) return;
    setSavingTask(true);
    try {
      const res = await fetch("/api/projects/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: expandedId,
          title: taskForm.title,
          status: taskForm.status,
          priority: taskForm.priority,
        }),
      });
      if (!res.ok) throw new Error("Failed to add task");
      setTaskForm({ title: "", status: "todo", priority: "medium" });
      setShowAddTask(false);
      await fetchTasks(expandedId);
      await fetchProjects(); // refresh counts
    } catch (err) {
      console.error("Failed to add task:", err);
    } finally {
      setSavingTask(false);
    }
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Manage projects and track progress
            </p>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Stat Cards */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Active Projects */}
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <FolderKanban className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Projects</p>
                  <p className="text-2xl font-semibold">{activeProjects}</p>
                </div>
              </div>

              {/* Total Tasks */}
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <ListTodo className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-semibold">{totalTasks}</p>
                </div>
              </div>

              {/* Completed Tasks */}
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <CheckCircle2 className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed Tasks</p>
                  <p className="text-2xl font-semibold">{completedTasks}</p>
                </div>
              </div>
            </div>
          )}

          {/* Status Filter Tabs */}
          {!loading && projects.length > 0 && (
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    statusFilter === tab.value
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Project List */}
          {loading ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Create your first project to start tracking work."
              action={{ label: "Create Project", onClick: () => setShowCreateDialog(true) }}
            />
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No matching projects"
              description="Try selecting a different status filter."
            />
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project) => {
                const isExpanded = expandedId === project.id;
                const pct =
                  project.total_tasks > 0
                    ? Math.round((project.completed_tasks / project.total_tasks) * 100)
                    : 0;

                return (
                  <div
                    key={project.id}
                    className="rounded-xl border border-border bg-card overflow-hidden"
                  >
                    {/* Project Card Header */}
                    <button
                      onClick={() => toggleExpand(project.id)}
                      className="w-full px-5 py-4 text-left transition-colors hover:bg-secondary/30"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground truncate">
                              {project.name}
                            </h3>
                            <Badge config={statusBadge[project.status]} />
                            <Badge config={priorityBadge[project.priority]} />
                          </div>

                          {/* Progress bar */}
                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex-1 h-1.5 rounded-full bg-secondary">
                              <div
                                style={{ width: `${pct}%` }}
                                className="h-full rounded-full bg-primary transition-all"
                              />
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {project.completed_tasks}/{project.total_tasks} tasks
                            </span>
                          </div>

                          {/* Meta row */}
                          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                            {project.dueDate && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Due {new Date(project.dueDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            )}
                            <span>{pct}% complete</span>
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Expanded: Tasks list */}
                    {isExpanded && (
                      <div className="border-t border-border px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-muted-foreground">Tasks</h4>
                          <button
                            onClick={() => setShowAddTask(!showAddTask)}
                            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            Add Task
                          </button>
                        </div>

                        {/* Inline add task form */}
                        {showAddTask && (
                          <form
                            onSubmit={handleAddTask}
                            className="mb-4 rounded-lg border border-border bg-secondary/30 p-3 space-y-3"
                          >
                            <input
                              type="text"
                              required
                              value={taskForm.title}
                              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                              placeholder="Task title..."
                              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                            />
                            <div className="flex items-center gap-3">
                              <select
                                value={taskForm.status}
                                onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                                className="rounded-md border border-border bg-secondary px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="review">Review</option>
                                <option value="done">Done</option>
                                <option value="blocked">Blocked</option>
                              </select>
                              <select
                                value={taskForm.priority}
                                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                                className="rounded-md border border-border bg-secondary px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                              </select>
                              <div className="flex-1" />
                              <button
                                type="button"
                                onClick={() => setShowAddTask(false)}
                                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={savingTask}
                                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                              >
                                {savingTask ? "Adding..." : "Add"}
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Tasks list */}
                        {tasksLoading ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="h-10 animate-pulse rounded-md bg-secondary/60"
                              />
                            ))}
                          </div>
                        ) : tasks.length === 0 ? (
                          <p className="py-6 text-center text-sm text-muted-foreground">
                            No tasks yet. Add one to get started.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {tasks.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary/30"
                              >
                                <div
                                  className={cn(
                                    "h-2 w-2 rounded-full flex-shrink-0",
                                    task.status === "done"
                                      ? "bg-emerald-400"
                                      : task.status === "in_progress"
                                        ? "bg-blue-400"
                                        : task.status === "review"
                                          ? "bg-yellow-400"
                                          : task.status === "blocked"
                                            ? "bg-red-400"
                                            : "bg-gray-400"
                                  )}
                                />
                                <span
                                  className={cn(
                                    "flex-1 text-sm truncate",
                                    task.status === "done"
                                      ? "text-muted-foreground line-through"
                                      : "text-foreground"
                                  )}
                                >
                                  {task.title}
                                </span>
                                <Badge config={taskStatusBadge[task.status]} />
                                <Badge config={priorityBadge[task.priority]} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create Project</h2>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Project name"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="What is this project about?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateDialog(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
