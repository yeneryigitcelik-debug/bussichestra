"use client";

import { Bell, Search } from "lucide-react";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">{title || "OrchestraOS"}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
          <Search className="h-4 w-4" />
        </button>
        <button className="relative rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </button>
      </div>
    </header>
  );
}
