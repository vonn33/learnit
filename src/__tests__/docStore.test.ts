import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDocStore } from '@/store/docStore';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  },
}));

beforeEach(() => {
  useDocStore.getState().reset();
});

describe('useDocStore', () => {
  it('starts with empty docs and not loading', () => {
    const s = useDocStore.getState();
    expect(s.docs).toEqual([]);
    expect(s.loading).toBe(false);
    expect(s.activeContent).toBeNull();
  });

  it('reset clears state', () => {
    const s = useDocStore.getState();
    s.docs = [{ id: 'a' } as never];
    useDocStore.getState().reset();
    expect(useDocStore.getState().docs).toEqual([]);
  });
});
