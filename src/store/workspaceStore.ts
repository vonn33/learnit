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
  defaultLayout: DefaultLayout;
  setMode: (mode: PaneMode) => void;
  setSplitPercent: (pct: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setShowMap: (show: boolean) => void;
  setShowStagingInbox: (show: boolean) => void;
  setDefaultLayout: (layout: DefaultLayout) => void;
  reset: () => void;
}

const DEFAULTS = {
  mode: 'split' as PaneMode,
  splitPercent: 40,
  sidebarCollapsed: false,
  showMap: true,
  showStagingInbox: true,
  defaultLayout: 'split' as DefaultLayout,
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
      setDefaultLayout: (defaultLayout) => set({defaultLayout}),
      reset: () => set(DEFAULTS),
    }),
    {name: 'learnit-workspace'},
  ),
);
