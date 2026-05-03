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

  it('addTag inserts and appends to state', async () => {
    const { supabase } = await import('@/lib/supabase');
    const newRow = { id: 'new-uuid-0000', label: 'Important', color: '#ef4444', user_id: null, created_at: '' };
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      insert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: newRow, error: null }) }),
      }),
    } as never);

    const tag = await useTagStore.getState().addTag({ name: 'Important', color: '#ef4444' });
    expect(tag.id).toBe('new-uuid-0000');
    expect(useTagStore.getState().tags).toHaveLength(1);
    expect(useTagStore.getState().tags[0].name).toBe('Important');
  });

  it('addTag dedup: realtime and insert both fire', async () => {
    const { supabase } = await import('@/lib/supabase');
    const row = { id: 'dup-uuid', label: 'Dup', color: '#aaa', user_id: null, created_at: '' };
    useTagStore.setState({ tags: [{ id: 'dup-uuid', name: 'Dup', color: '#aaa' }] });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      insert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: row, error: null }) }),
      }),
    } as never);

    await useTagStore.getState().addTag({ name: 'Dup', color: '#aaa' });
    expect(useTagStore.getState().tags).toHaveLength(1);
  });

  it('updateTag patches name and color', async () => {
    const { supabase } = await import('@/lib/supabase');
    useTagStore.setState({ tags: [{ id: 't1', name: 'Old', color: '#111' }] });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    } as never);

    await useTagStore.getState().updateTag('t1', { name: 'New', color: '#222' });
    const updated = useTagStore.getState().tags[0];
    expect(updated.name).toBe('New');
    expect(updated.color).toBe('#222');
  });

  it('removeTag removes from state', async () => {
    const { supabase } = await import('@/lib/supabase');
    useTagStore.setState({ tags: [{ id: 't1', name: 'Old', color: '#111' }] });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    } as never);

    await useTagStore.getState().removeTag('t1');
    expect(useTagStore.getState().tags).toEqual([]);
  });
});
