import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTagStore } from '@/store/tagStore';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn(() => ({
        select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
      })),
      update: vi.fn(() => ({ eq: () => Promise.resolve({ error: null }) })),
      delete: vi.fn(() => ({ eq: () => Promise.resolve({ error: null }) })),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  },
}));

beforeEach(() => {
  useTagStore.getState().reset();
});

describe('useTagStore', () => {
  it('starts with empty tags', () => {
    expect(useTagStore.getState().tags).toEqual([]);
  });

  it('fetchAll loads tags from Supabase', async () => {
    const { supabase } = await import('@/lib/supabase');
    const rows = [
      { id: 'a1b2c3d4-0000-0000-0000-000000000001', label: 'Key point', color: '#facc15', user_id: null, created_at: '' },
    ];
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      select: () => ({ order: () => Promise.resolve({ data: rows, error: null }) }),
    } as never);

    await useTagStore.getState().fetchAll();
    expect(useTagStore.getState().tags).toEqual([
      { id: 'a1b2c3d4-0000-0000-0000-000000000001', name: 'Key point', color: '#facc15' },
    ]);
  });

  it('fetchAll seeds default tag when Supabase returns empty', async () => {
    const { supabase } = await import('@/lib/supabase');
    const seededRow = { id: 'seed-uuid-0000-0000-0000-000000000001', label: 'Key point', color: '#facc15', user_id: null, created_at: '' };
    let callCount = 0;
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      select: () => ({
        order: () => {
          callCount++;
          if (callCount === 1) return Promise.resolve({ data: [], error: null });
          return Promise.resolve({ data: [seededRow], error: null });
        },
      }),
      insert: () => Promise.resolve({ error: null }),
    }));

    await useTagStore.getState().fetchAll();
    expect(useTagStore.getState().tags).toHaveLength(1);
    expect(useTagStore.getState().tags[0].name).toBe('Key point');
  });
});
