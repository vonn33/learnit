import {create} from 'zustand';
import {persist} from 'zustand/middleware';

type PaneMode = 'split' | 'focus-left' | 'focus-right';

interface WorkspaceState {
  mode: PaneMode;
  splitPercent: number;
  sidebarCollapsed: boolean;
  setMode: (mode: PaneMode) => void;
  setSplitPercent: (pct: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  reset: () => void;
}

const DEFAULTS = {mode: 'split' as PaneMode, splitPercent: 40, sidebarCollapsed: false};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setMode: (mode) => set({mode}),
      setSplitPercent: (splitPercent) => set({splitPercent}),
      setSidebarCollapsed: (sidebarCollapsed) => set({sidebarCollapsed}),
      reset: () => set(DEFAULTS),
    }),
    {name: 'learnit-workspace'},
  ),
);
