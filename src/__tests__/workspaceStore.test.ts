import {describe, it, expect, beforeEach} from 'vitest';
import {useWorkspaceStore} from '@/store/workspaceStore';

beforeEach(() => {
  useWorkspaceStore.getState().reset();
});

describe('useWorkspaceStore', () => {
  it('starts with default state', () => {
    const state = useWorkspaceStore.getState();
    expect(state.mode).toBe('split');
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
    expect(state.mode).toBe('split');
    expect(state.sidebarCollapsed).toBe(false);
  });
});
