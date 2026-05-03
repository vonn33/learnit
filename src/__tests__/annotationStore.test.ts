import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAnnotationStore } from '@/store/annotationStore';

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
  useAnnotationStore.getState().reset();
});

function mockInsertOnce(returnRow: Record<string, unknown>) {
  return async () => {
    const { supabase } = await import('@/lib/supabase');
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: returnRow, error: null }),
        }),
      }),
    } as never);
  };
}

describe('useAnnotationStore', () => {
  it('starts with empty annotations', () => {
    expect(useAnnotationStore.getState().annotations).toEqual([]);
  });

  it('adds a highlight annotation', async () => {
    await mockInsertOnce({
      id: 'a1', doc_id: 'doc-1', type: 'highlight', text: 'spaced repetition',
      anchor_context: '', tag_ids: [], note: '', connection_url: '',
      map_node_id: null, user_id: null, created_at: '2026-05-03T00:00:00Z',
    })();

    const id = await useAnnotationStore.getState().addAnnotation({
      docId: 'doc-1', type: 'highlight', text: 'spaced repetition',
      anchorContext: '', tagIds: [], note: '', connectionUrl: '',
    });
    expect(id).toBe('a1');
    const { annotations } = useAnnotationStore.getState();
    expect(annotations).toHaveLength(1);
    expect(annotations[0].type).toBe('highlight');
    expect(annotations[0].text).toBe('spaced repetition');
    expect(annotations[0].id).toBeDefined();
    expect(annotations[0].createdAt).toBeDefined();
  });

  it('adds a quick-capture annotation', async () => {
    await mockInsertOnce({
      id: 'qc1', doc_id: 'doc-1', type: 'quick-capture', text: 'important concept',
      anchor_context: '', tag_ids: [], note: '', connection_url: '',
      map_node_id: null, user_id: null, created_at: '2026-05-03T00:00:00Z',
    })();

    const id = await useAnnotationStore.getState().addAnnotation({
      docId: 'doc-1', type: 'quick-capture', text: 'important concept',
      anchorContext: '', tagIds: [], note: '', connectionUrl: '',
    });
    expect(id).toBe('qc1');
    expect(useAnnotationStore.getState().annotations[0].type).toBe('quick-capture');
  });

  it('updates an annotation note and mapNodeId', async () => {
    useAnnotationStore.setState({
      annotations: [{
        id: 'a1', docId: 'doc', type: 'highlight', text: 't', anchorContext: '',
        tagIds: [], note: '', connectionUrl: '', createdAt: '',
      }],
      showAnnotations: true,
    });
    await useAnnotationStore.getState().updateAnnotation('a1', { note: 'this is key', mapNodeId: 'node-1' });
    const updated = useAnnotationStore.getState().annotations[0];
    expect(updated.note).toBe('this is key');
    expect(updated.mapNodeId).toBe('node-1');
  });

  it('removes an annotation', async () => {
    useAnnotationStore.setState({
      annotations: [{
        id: 'a1', docId: 'doc', type: 'highlight', text: 't', anchorContext: '',
        tagIds: [], note: '', connectionUrl: '', createdAt: '',
      }],
      showAnnotations: true,
    });
    await useAnnotationStore.getState().removeAnnotation('a1');
    expect(useAnnotationStore.getState().annotations).toEqual([]);
  });

  it('getAnnotationsForDoc filters correctly', () => {
    useAnnotationStore.setState({
      annotations: [
        { id: '1', docId: 'A', type: 'highlight', text: '', anchorContext: '', tagIds: [], note: '', connectionUrl: '', createdAt: '' },
        { id: '2', docId: 'B', type: 'highlight', text: '', anchorContext: '', tagIds: [], note: '', connectionUrl: '', createdAt: '' },
        { id: '3', docId: 'A', type: 'note', text: '', anchorContext: '', tagIds: [], note: '', connectionUrl: '', createdAt: '' },
      ],
      showAnnotations: true,
    });
    expect(useAnnotationStore.getState().getAnnotationsForDoc('A')).toHaveLength(2);
  });

  it('toggleAnnotations flips showAnnotations', () => {
    expect(useAnnotationStore.getState().showAnnotations).toBe(true);
    useAnnotationStore.getState().toggleAnnotations();
    expect(useAnnotationStore.getState().showAnnotations).toBe(false);
  });
});

describe('unified annotation fields', () => {
  it('addAnnotation stores anchorContext, tagIds, and connectionUrl', async () => {
    await mockInsertOnce({
      id: 'aa1', doc_id: '/docs/test/page', type: 'highlight', text: 'selected text',
      anchor_context: 'before|||selected text|||after',
      tag_ids: ['tag-1'], note: 'my note', connection_url: 'https://example.com',
      map_node_id: null, user_id: null, created_at: '2026-05-03T00:00:00Z',
    })();

    const id = await useAnnotationStore.getState().addAnnotation({
      docId: '/docs/test/page',
      type: 'highlight',
      text: 'selected text',
      anchorContext: 'before|||selected text|||after',
      tagIds: ['tag-1'],
      note: 'my note',
      connectionUrl: 'https://example.com',
    });
    const a = useAnnotationStore.getState().annotations.find((x) => x.id === id)!;
    expect(a.anchorContext).toBe('before|||selected text|||after');
    expect(a.tagIds).toEqual(['tag-1']);
    expect(a.connectionUrl).toBe('https://example.com');
  });

  it('updateAnnotation can patch tagIds and connectionUrl', async () => {
    useAnnotationStore.setState({
      annotations: [{
        id: 'u1', docId: '/docs/test', type: 'highlight', text: 'text',
        anchorContext: '|||text|||', tagIds: [], note: '', connectionUrl: '',
        createdAt: '',
      }],
      showAnnotations: true,
    });
    await useAnnotationStore.getState().updateAnnotation('u1', {
      tagIds: ['t1', 't2'],
      connectionUrl: '/docs/other',
    });
    const a = useAnnotationStore.getState().annotations.find((x) => x.id === 'u1')!;
    expect(a.tagIds).toEqual(['t1', 't2']);
    expect(a.connectionUrl).toBe('/docs/other');
  });

  it('removeAnnotation removes record completely with no ghost', async () => {
    useAnnotationStore.setState({
      annotations: [{
        id: 'r1', docId: '/docs/test', type: 'highlight', text: 'text',
        anchorContext: '|||text|||', tagIds: [], note: '', connectionUrl: '',
        createdAt: '',
      }],
      showAnnotations: true,
    });
    await useAnnotationStore.getState().removeAnnotation('r1');
    const found = useAnnotationStore.getState().annotations.find((x) => x.id === 'r1');
    expect(found).toBeUndefined();
  });
});
