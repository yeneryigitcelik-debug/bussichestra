import { create } from "zustand";
import type { AIWorker } from "@/types/database";

interface AppState {
  // Workers
  workers: AIWorker[];
  activeWorkerId: string | null;
  setWorkers: (workers: AIWorker[]) => void;
  setActiveWorkerId: (id: string | null) => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  workers: [],
  activeWorkerId: null,
  setWorkers: (workers) => set({ workers }),
  setActiveWorkerId: (id) => set({ activeWorkerId: id }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
