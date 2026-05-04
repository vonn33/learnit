import {create} from 'zustand';
import {persist} from 'zustand/middleware';

type PaneMode = 'split' | 'focus-left' | 'focus-right';
export type DefaultLayout = 'split' | 'reader-only' | 'map-only';

interface WorkspaceState {
  mode: PaneMode;
  splitPercent: number;
  sidebarCollapsed: boolean;
  showMap: boolean;
  showStagingInbox: boolean;
  showToc: boolean;
  defaultLayout: DefaultLayout;
  setMode: (mode: PaneMode) => void;
  setSplitPercent: (pct: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setShowMap: (show: boolean) => void;
  setShowStagingInbox: (show: boolean) => void;
  toggleToc: () => void;
  setDefaultLayout: (layout: DefaultLayout) => void;
  reset: () => void;
}

const DEFAULTS = {
  mode: 'focus-left' as PaneMode,
  splitPercent: 40,
  sidebarCollapsed: false,
  showMap: false,
  showStagingInbox: true,
  showToc: true,
  defaultLayout: 'reader-only' as DefaultLayout,
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setMode: (mode) => set({mode}),
      setSplitPercent: (splitPercent) => set({splitPercent}),
      setSidebarCollapsed: (sidebarCollapsed) => set({sidebarCollapsed}),
      setShowMap: (showMap) => set({showMap}),
      setShowStagingInbox: (showStagingInbox) => set({showStagingInbox}),
      toggleToc: () => set((s) => ({showToc: !s.showToc})),
      setDefaultLayout: (defaultLayout) => set({defaultLayout}),
      reset: () => set(DEFAULTS),
    }),
    {name: 'learnit-workspace'},
  ),
);
