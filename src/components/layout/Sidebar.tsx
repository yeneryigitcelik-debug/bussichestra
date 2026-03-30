"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare, Users, LayoutDashboard, DollarSign,
  Package, UserCircle, Mail, Settings, Menu, X, LogOut,
  FolderKanban, FileText, Bell, Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useSupabase } from "@/hooks/useSupabase";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "group-hover:text-purple-400" },
  { name: "Chat", href: "/chat", icon: MessageSquare, color: "group-hover:text-blue-400" },
  { name: "Workers", href: "/workers", icon: Users, color: "group-hover:text-cyan-400" },
  { name: "Finance", href: "/finance", icon: DollarSign, color: "group-hover:text-emerald-400" },
  { name: "CRM", href: "/crm", icon: UserCircle, color: "group-hover:text-blue-400" },
  { name: "Inventory", href: "/inventory", icon: Package, color: "group-hover:text-orange-400" },
  { name: "Projects", href: "/projects", icon: FolderKanban, color: "group-hover:text-violet-400" },
  { name: "Documents", href: "/documents", icon: FileText, color: "group-hover:text-amber-400" },
  { name: "Mail", href: "/mail", icon: Mail, color: "group-hover:text-pink-400" },
  { name: "Pipeline", href: "/pipeline", icon: Workflow, color: "group-hover:text-rose-400" },
  { name: "Notifications", href: "/notifications", icon: Bell, color: "group-hover:text-yellow-400" },
  { name: "Settings", href: "/settings", icon: Settings, color: "group-hover:text-gray-400" },
];

const activeColors: Record<string, string> = {
  "/dashboard": "text-purple-400 bg-purple-500/10 border-purple-500/20",
  "/chat": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "/workers": "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  "/finance": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "/crm": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "/inventory": "text-orange-400 bg-orange-500/10 border-orange-500/20",
  "/projects": "text-violet-400 bg-violet-500/10 border-violet-500/20",
  "/documents": "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "/mail": "text-pink-400 bg-pink-500/10 border-pink-500/20",
  "/pipeline": "text-rose-400 bg-rose-500/10 border-rose-500/20",
  "/notifications": "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  "/settings": "text-gray-400 bg-gray-500/10 border-gray-500/20",
};

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useSupabase();

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-card/80 p-2 text-muted-foreground shadow-lg backdrop-blur-sm hover:bg-secondary md:hidden"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          {/* Pixel art logo */}
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 ring-1 ring-white/10">
            <svg width="24" height="24" viewBox="0 0 8 8" style={{ imageRendering: "pixelated" }}>
              <rect x="1" y="0" width="2" height="1" fill="#fff" />
              <rect x="5" y="0" width="2" height="1" fill="#fff" />
              <rect x="0" y="1" width="1" height="2" fill="#C084FC" />
              <rect x="1" y="1" width="6" height="2" fill="#fff" />
              <rect x="7" y="1" width="1" height="2" fill="#C084FC" />
              <rect x="1" y="3" width="6" height="1" fill="#E9D5FF" />
              <rect x="2" y="4" width="4" height="1" fill="#fff" />
              <rect x="1" y="5" width="6" height="1" fill="#C084FC" />
              <rect x="2" y="6" width="1" height="1" fill="#A855F7" />
              <rect x="5" y="6" width="1" height="1" fill="#A855F7" />
              <rect x="3" y="7" width="2" height="1" fill="#7C3AED" />
            </svg>
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-gradient">OrchestraOS</span>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Business OS</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-3 py-4 scrollbar-thin overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const matchedRoute = Object.keys(activeColors).find(
              (r) => pathname === r || pathname.startsWith(r + "/")
            );
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? cn("border-current/10", activeColors[matchedRoute || item.href] || "bg-secondary text-foreground")
                    : "border-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-4 w-4 transition-colors",
                  isActive ? "" : item.color
                )} />
                {item.name}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 ring-1 ring-white/10">
              <span className="text-sm font-bold text-purple-300">
                {user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user?.user_metadata?.full_name || "CEO"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email || "Owner"}
              </p>
            </div>
            <button
              onClick={signOut}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
