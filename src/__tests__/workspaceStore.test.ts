import {describe, it, expect, beforeEach} from 'vitest';
import {useWorkspaceStore} from '@/store/workspaceStore';

beforeEach(() => {
  useWorkspaceStore.getState().reset();
});

describe('useWorkspaceStore', () => {
  it('starts with default state', () => {
    const state = useWorkspaceStore.getState();
    expect(state.mode).toBe('focus-left');
    expect(state.splitPercent).toBe(40);
    expect(state.sidebarCollapsed).toBe(false);
  });

  it('setMode updates mode', () => {
    useWorkspaceStore.getState().setMode('focus-left');
    expect(useWorkspaceStore.getState().mode).toBe('focus-left');
  });

  it('setSplitPercent updates splitPercent', () => {
    useWorkspaceStore.getState().setSplitPercent(60);
    expect(useWorkspaceStore.getState().splitPercent).toBe(60);
  });

  it('setSidebarCollapsed toggles collapsed', () => {
    useWorkspaceStore.getState().setSidebarCollapsed(true);
    expect(useWorkspaceStore.getState().sidebarCollapsed).toBe(true);
  });

  it('reset restores defaults', () => {
    useWorkspaceStore.getState().setMode('focus-right');
    useWorkspaceStore.getState().setSidebarCollapsed(true);
    useWorkspaceStore.getState().reset();
    const state = useWorkspaceStore.getState();
    expect(state.mode).toBe('focus-left');
    expect(state.sidebarCollapsed).toBe(false);
  });

  it('starts with map and staging inbox shown by default', () => {
    const state = useWorkspaceStore.getState();
    expect(state.showMap).toBe(false);
    expect(state.showStagingInbox).toBe(true);
  });

  it('starts with split as default layout', () => {
    expect(useWorkspaceStore.getState().defaultLayout).toBe('reader-only');
  });

  it('setShowMap toggles map visibility', () => {
    useWorkspaceStore.getState().setShowMap(false);
    expect(useWorkspaceStore.getState().showMap).toBe(false);
  });

  it('setShowStagingInbox toggles staging inbox visibility', () => {
    useWorkspaceStore.getState().setShowStagingInbox(false);
    expect(useWorkspaceStore.getState().showStagingInbox).toBe(false);
  });

  it('setDefaultLayout updates the persisted preset', () => {
    useWorkspaceStore.getState().setDefaultLayout('reader-only');
    expect(useWorkspaceStore.getState().defaultLayout).toBe('reader-only');
  });

  it('reset restores all new fields too', () => {
    const s = useWorkspaceStore.getState();
    s.setShowMap(false);
    s.setShowStagingInbox(false);
    s.setDefaultLayout('map-only');
    s.reset();
    const after = useWorkspaceStore.getState();
    expect(after.showMap).toBe(false);
    expect(after.showStagingInbox).toBe(true);
    expect(after.defaultLayout).toBe('reader-only');
  });

  it('starts with showToc true by default', () => {
    expect(useWorkspaceStore.getState().showToc).toBe(true);
  });

  it('toggleToc flips showToc', () => {
    const initial = useWorkspaceStore.getState().showToc;
    useWorkspaceStore.getState().toggleToc();
    expect(useWorkspaceStore.getState().showToc).toBe(!initial);
  });
});
