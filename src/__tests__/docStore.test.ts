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

  it('fetchAll loads docs from Supabase', async () => {
    const { supabase } = await import('@/lib/supabase');
    const fakeDocs = [
      { id: '1', title: 'A', slug: 'a', project: 'p', section: 's', content_md: '', abstract: '', toc_json: [], word_count: 0, user_id: null, created_at: '', updated_at: '' },
    ];
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      select: () => ({
        order: () => Promise.resolve({ data: fakeDocs, error: null }),
      }),
    } as never);

    await useDocStore.getState().fetchAll();
    expect(useDocStore.getState().docs).toEqual(fakeDocs);
    expect(useDocStore.getState().loading).toBe(false);
  });

  it('fetchContent loads single doc by slug', async () => {
    const { supabase } = await import('@/lib/supabase');
    const doc = { id: '1', title: 'A', slug: 'a', project: 'p', section: 's', content_md: '# Hi', abstract: '', toc_json: [], word_count: 1, user_id: null, created_at: '', updated_at: '' };
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: doc, error: null }),
        }),
      }),
    } as never);

    const result = await useDocStore.getState().fetchContent('a');
    expect(result?.content_md).toBe('# Hi');
    expect(useDocStore.getState().activeContent).toEqual({ slug: 'a', content_md: '# Hi' });
  });

  it('createDoc inserts and returns new doc', async () => {
    const { supabase } = await import('@/lib/supabase');
    const created = { id: 'new', title: 'T', slug: 't', project: 'p', section: 's', content_md: '#T', abstract: '', toc_json: [], word_count: 1, user_id: null, created_at: '', updated_at: '' };
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: created, error: null }),
        }),
      }),
    } as never);

    const result = await useDocStore.getState().createDoc({
      title: 'T', slug: 't', project: 'p', section: 's',
      content_md: '#T', abstract: '', toc_json: [], word_count: 1,
    });
    expect(result.id).toBe('new');
  });
});
