import {describe, it, expect, beforeEach, vi} from 'vitest';
import {useAnnotationStore} from '@/store/annotationStore';
import {useMapStore} from '@/store/mapStore';

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
  useMapStore.getState().reset();
});

async function mockInsertOnce(returnRow: Record<string, unknown>) {
  const { supabase } = await import('@/lib/supabase');
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce({
    insert: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: returnRow, error: null }),
      }),
    }),
  } as never);
}

function makeRow(id: string, text = 'test') {
  return {
    id, doc_id: 'doc-1', type: 'highlight', text,
    anchor_context: '', tag_ids: [], note: '', connection_url: '',
    map_node_id: null, user_id: null, created_at: '2026-05-03T00:00:00Z',
  };
}

describe('connect-to-node store interactions', () => {
  it('links annotation to map node (both stores updated)', async () => {
    await mockInsertOnce(makeRow('a1', 'test selection'));
    const annotationId = await useAnnotationStore.getState().addAnnotation({
      docId: 'doc-1',
      type: 'highlight',
      text: 'test selection',
      anchorContext: '',
      tagIds: [],
      note: '',
      connectionUrl: '',
    });
    useMapStore.getState().initMap('topic-1');
    const nodeId = useMapStore.getState().addNode('topic-1', {
      label: 'Test Node',
      type: 'concept',
      status: 'placed',
      position: {x: 100, y: 100},
    });

    // Simulate NotePanel handleConnect
    await useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId});
    useMapStore.getState().updateNode('topic-1', nodeId, {annotationId});

    const annotation = useAnnotationStore.getState().annotations[0];
    const node = useMapStore.getState().maps['topic-1'].nodes[0];
    expect(annotation.mapNodeId).toBe(nodeId);
    expect(node.annotationId).toBe(annotationId);
  });

  it('disconnects annotation from map node (both stores cleared)', async () => {
    await mockInsertOnce(makeRow('a2'));
    const annotationId = await useAnnotationStore.getState().addAnnotation({
      docId: 'doc-1',
      type: 'highlight',
      text: 'test',
      anchorContext: '',
      tagIds: [],
      note: '',
      connectionUrl: '',
    });
    useMapStore.getState().initMap('topic-1');
    const nodeId = useMapStore.getState().addNode('topic-1', {
      label: 'Node',
      type: 'concept',
      status: 'placed',
      position: {x: 0, y: 0},
    });
    await useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId});
    useMapStore.getState().updateNode('topic-1', nodeId, {annotationId});

    // Simulate NotePanel handleDisconnect
    await useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: undefined});
    useMapStore.getState().updateNode('topic-1', nodeId, {annotationId: undefined});

    const annotation = useAnnotationStore.getState().annotations[0];
    const node = useMapStore.getState().maps['topic-1'].nodes[0];
    expect(annotation.mapNodeId).toBeUndefined();
    expect(node.annotationId).toBeUndefined();
  });

  it('can reconnect to a different node', async () => {
    await mockInsertOnce(makeRow('a3'));
    const annotationId = await useAnnotationStore.getState().addAnnotation({
      docId: 'doc-1',
      type: 'highlight',
      text: 'test',
      anchorContext: '',
      tagIds: [],
      note: '',
      connectionUrl: '',
    });
    useMapStore.getState().initMap('topic-1');
    const nodeId1 = useMapStore.getState().addNode('topic-1', {
      label: 'Node A',
      type: 'concept',
      status: 'placed',
      position: {x: 0, y: 0},
    });
    const nodeId2 = useMapStore.getState().addNode('topic-1', {
      label: 'Node B',
      type: 'concept',
      status: 'placed',
      position: {x: 200, y: 0},
    });

    await useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId1});
    useMapStore.getState().updateNode('topic-1', nodeId1, {annotationId});

    // Reconnect to node 2
    await useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId2});
    useMapStore.getState().updateNode('topic-1', nodeId1, {annotationId: undefined});
    useMapStore.getState().updateNode('topic-1', nodeId2, {annotationId});

    expect(useAnnotationStore.getState().annotations[0].mapNodeId).toBe(nodeId2);
    expect(useMapStore.getState().maps['topic-1'].nodes.find((n) => n.id === nodeId1)?.annotationId).toBeUndefined();
    expect(useMapStore.getState().maps['topic-1'].nodes.find((n) => n.id === nodeId2)?.annotationId).toBe(annotationId);
  });
});
