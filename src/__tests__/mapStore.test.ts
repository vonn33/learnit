import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMapStore } from '@/store/mapStore';

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
  useMapStore.getState().reset();
});

describe('useMapStore', () => {
  it('starts with empty maps', () => {
    const { maps } = useMapStore.getState();
    expect(maps).toEqual({});
  });

  it('initializes a topic map', () => {
    useMapStore.getState().initMap('language-learning');
    const map = useMapStore.getState().maps['language-learning'];
    expect(map).toBeDefined();
    expect(map.nodes).toEqual([]);
    expect(map.edges).toEqual([]);
  });

  it('adds a placed node', async () => {
    useMapStore.getState().initMap('topic-1');
    await useMapStore.getState().addNode('topic-1', {
      label: 'Spaced Repetition',
      type: 'concept',
      status: 'placed',
      position: { x: 100, y: 200 },
    });

    const nodes = useMapStore.getState().maps['topic-1'].nodes;
    expect(nodes).toHaveLength(1);
    expect(nodes[0].label).toBe('Spaced Repetition');
    expect(nodes[0].status).toBe('placed');
    expect(nodes[0].id).toBeDefined();
  });

  it('adds a staged node (quick capture)', async () => {
    useMapStore.getState().initMap('topic-1');
    await useMapStore.getState().addNode('topic-1', {
      label: 'Important idea',
      type: 'concept',
      status: 'staged',
    });

    const nodes = useMapStore.getState().maps['topic-1'].nodes;
    expect(nodes[0].status).toBe('staged');
    expect(nodes[0].position).toBeUndefined();
  });

  it('promotes a staged node to placed', async () => {
    useMapStore.getState().initMap('topic-1');
    const nodeId = await useMapStore.getState().addNode('topic-1', {
      label: 'Staged idea',
      type: 'concept',
      status: 'staged',
    });

    await useMapStore.getState().updateNode('topic-1', nodeId, {
      status: 'placed',
      position: { x: 50, y: 50 },
    });

    const node = useMapStore.getState().maps['topic-1'].nodes[0];
    expect(node.status).toBe('placed');
    expect(node.position).toEqual({ x: 50, y: 50 });
  });

  it('adds an edge between nodes', async () => {
    useMapStore.getState().initMap('topic-1');
    const n1 = await useMapStore.getState().addNode('topic-1', {
      label: 'A', type: 'concept', status: 'placed', position: { x: 0, y: 0 },
    });
    const n2 = await useMapStore.getState().addNode('topic-1', {
      label: 'B', type: 'concept', status: 'placed', position: { x: 100, y: 0 },
    });

    await useMapStore.getState().addEdge('topic-1', {
      source: n1,
      target: n2,
      direction: 'forward',
    });

    const edges = useMapStore.getState().maps['topic-1'].edges;
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe(n1);
    expect(edges[0].target).toBe(n2);
  });

  it('removes a node and its connected edges', async () => {
    useMapStore.getState().initMap('t');
    const n1 = await useMapStore.getState().addNode('t', {
      label: 'A', type: 'concept', status: 'placed', position: { x: 0, y: 0 },
    });
    const n2 = await useMapStore.getState().addNode('t', {
      label: 'B', type: 'concept', status: 'placed', position: { x: 100, y: 0 },
    });
    await useMapStore.getState().addEdge('t', { source: n1, target: n2, direction: 'forward' });

    await useMapStore.getState().removeNode('t', n1);

    expect(useMapStore.getState().maps['t'].nodes).toHaveLength(1);
    expect(useMapStore.getState().maps['t'].edges).toHaveLength(0);
  });

  it('loads scaffold nodes into a map', async () => {
    const scaffold = [
      { label: 'Chapter 1', type: 'structural' as const },
      { label: 'Chapter 2', type: 'structural' as const },
    ];
    await useMapStore.getState().loadScaffold('topic-1', scaffold);

    const map = useMapStore.getState().maps['topic-1'];
    expect(map.nodes).toHaveLength(2);
    expect(map.nodes[0].type).toBe('structural');
    expect(map.nodes[0].status).toBe('placed');
    expect(map.nodes[0].position).toBeDefined();
  });

  it('returns staged nodes for a topic', async () => {
    useMapStore.getState().initMap('t');
    await useMapStore.getState().addNode('t', { label: 'A', type: 'concept', status: 'placed', position: { x: 0, y: 0 } });
    await useMapStore.getState().addNode('t', { label: 'B', type: 'concept', status: 'staged' });
    await useMapStore.getState().addNode('t', { label: 'C', type: 'concept', status: 'staged' });

    const staged = useMapStore.getState().getStagedNodes('t');
    expect(staged).toHaveLength(2);
  });
});

describe('drag-to-canvas (store)', () => {
  it('promotes staged node to placed with a given position', async () => {
    useMapStore.getState().initMap('t');
    const nodeId = await useMapStore.getState().addNode('t', {
      label: 'Captured idea',
      type: 'concept',
      status: 'staged',
    });

    // Simulate what onDrop calls after coordinate conversion
    await useMapStore.getState().updateNode('t', nodeId, {
      status: 'placed',
      position: { x: 320, y: 180 },
    });

    const node = useMapStore.getState().maps['t'].nodes[0];
    expect(node.status).toBe('placed');
    expect(node.position).toEqual({ x: 320, y: 180 });
  });
});

describe('confidence states', () => {
  it('sets confidence on a node via updateNode', async () => {
    useMapStore.getState().initMap('t');
    const nodeId = await useMapStore.getState().addNode('t', {
      label: 'Spaced Repetition',
      type: 'concept',
      status: 'placed',
      position: { x: 0, y: 0 },
    });

    await useMapStore.getState().updateNode('t', nodeId, { confidence: 'familiar' });

    const node = useMapStore.getState().maps['t'].nodes[0];
    expect(node.confidence).toBe('familiar');
  });

  it('clears confidence when set to undefined', async () => {
    useMapStore.getState().initMap('t');
    const nodeId = await useMapStore.getState().addNode('t', {
      label: 'Node',
      type: 'concept',
      status: 'placed',
      position: { x: 0, y: 0 },
    });

    await useMapStore.getState().updateNode('t', nodeId, { confidence: 'mastered' });
    await useMapStore.getState().updateNode('t', nodeId, { confidence: undefined });

    const node = useMapStore.getState().maps['t'].nodes[0];
    expect(node.confidence).toBeUndefined();
  });

  it('confidence does not affect other node fields', async () => {
    useMapStore.getState().initMap('t');
    const nodeId = await useMapStore.getState().addNode('t', {
      label: 'Node',
      type: 'concept',
      status: 'placed',
      position: { x: 10, y: 20 },
    });

    await useMapStore.getState().updateNode('t', nodeId, { confidence: 'uncertain' });

    const node = useMapStore.getState().maps['t'].nodes[0];
    expect(node.label).toBe('Node');
    expect(node.position).toEqual({ x: 10, y: 20 });
  });
});

describe('path highlighting (neighbor computation)', () => {
  function getNeighborIds(nodeId: string, edges: Array<{ source: string; target: string }>): Set<string> {
    const ids = new Set<string>();
    for (const e of edges) {
      if (e.source === nodeId) ids.add(e.target);
      if (e.target === nodeId) ids.add(e.source);
    }
    return ids;
  }

  it('finds direct neighbors via outgoing and incoming edges', () => {
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'd', target: 'b' },
    ];

    const neighbors = getNeighborIds('b', edges);
    expect(neighbors.has('a')).toBe(true);
    expect(neighbors.has('c')).toBe(true);
    expect(neighbors.has('d')).toBe(true);
    expect(neighbors.has('b')).toBe(false);
  });

  it('returns empty set for an isolated node', () => {
    expect(getNeighborIds('x', [])).toEqual(new Set());
  });
});

describe('edge semantics (store)', () => {
  it('updateEdge sets relationshipType on an edge', async () => {
    const store = useMapStore.getState();
    store.initMap('es1');
    const nA = await store.addNode('es1', { label: 'A', type: 'concept', status: 'placed' });
    const nB = await store.addNode('es1', { label: 'B', type: 'concept', status: 'placed' });
    const eId = await store.addEdge('es1', { source: nA, target: nB, direction: 'forward' });
    await store.updateEdge('es1', eId, { relationshipType: 'causes' });
    const edge = useMapStore.getState().maps['es1'].edges.find((e) => e.id === eId);
    expect(edge?.relationshipType).toBe('causes');
  });

  it('updateEdge sets note on an edge', async () => {
    const store = useMapStore.getState();
    store.initMap('es2');
    const nA = await store.addNode('es2', { label: 'A', type: 'concept', status: 'placed' });
    const nB = await store.addNode('es2', { label: 'B', type: 'concept', status: 'placed' });
    const eId = await store.addEdge('es2', { source: nA, target: nB, direction: 'forward' });
    await store.updateEdge('es2', eId, { note: 'important link' });
    const edge = useMapStore.getState().maps['es2'].edges.find((e) => e.id === eId);
    expect(edge?.note).toBe('important link');
  });

  it('updateEdge clears relationshipType when set to undefined', async () => {
    const store = useMapStore.getState();
    store.initMap('es3');
    const nA = await store.addNode('es3', { label: 'A', type: 'concept', status: 'placed' });
    const nB = await store.addNode('es3', { label: 'B', type: 'concept', status: 'placed' });
    const eId = await store.addEdge('es3', { source: nA, target: nB, direction: 'forward' });
    await store.updateEdge('es3', eId, { relationshipType: 'causes' });
    await store.updateEdge('es3', eId, { relationshipType: undefined });
    const edge = useMapStore.getState().maps['es3'].edges.find((e) => e.id === eId);
    expect(edge?.relationshipType).toBeUndefined();
  });

  it('clearMap deletes nodes and edges for the given topic only', async () => {
    const { supabase } = await import('@/lib/supabase');
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn(() => ({
        select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
      })),
      update: vi.fn(() => ({ eq: () => Promise.resolve({ error: null }) })),
      delete: vi.fn(() => ({ eq: () => Promise.resolve({ error: null }) })),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    }));

    const store = useMapStore.getState();
    store.initMap('keep');
    store.initMap('wipe');
    const k = await store.addNode('keep', { label: 'K', type: 'concept', status: 'placed', position: { x: 0, y: 0 } });
    const a = await store.addNode('wipe', { label: 'A', type: 'concept', status: 'placed', position: { x: 0, y: 0 } });
    const b = await store.addNode('wipe', { label: 'B', type: 'concept', status: 'placed', position: { x: 100, y: 0 } });
    await store.addEdge('wipe', { source: a, target: b, direction: 'forward' });

    await store.clearMap('wipe');

    expect(useMapStore.getState().maps['wipe'].nodes).toEqual([]);
    expect(useMapStore.getState().maps['wipe'].edges).toEqual([]);
    expect(useMapStore.getState().maps['keep'].nodes.find((n) => n.id === k)).toBeDefined();
  });

  it('clearMap is a no-op for an unknown topic', async () => {
    const store = useMapStore.getState();
    store.initMap('exists');
    await store.clearMap('does-not-exist');
    expect(useMapStore.getState().maps['does-not-exist']).toBeUndefined();
    expect(useMapStore.getState().maps['exists']).toBeDefined();
  });

  it('updateEdge does not affect other edges in the same map', async () => {
    const store = useMapStore.getState();
    store.initMap('es4');
    const nA = await store.addNode('es4', { label: 'A', type: 'concept', status: 'placed' });
    const nB = await store.addNode('es4', { label: 'B', type: 'concept', status: 'placed' });
    const nC = await store.addNode('es4', { label: 'C', type: 'concept', status: 'placed' });
    const eAB = await store.addEdge('es4', { source: nA, target: nB, direction: 'forward' });
    const eBC = await store.addEdge('es4', { source: nB, target: nC, direction: 'forward' });
    await store.updateEdge('es4', eAB, { relationshipType: 'causes' });
    const edgeBC = useMapStore.getState().maps['es4'].edges.find((e) => e.id === eBC);
    expect(edgeBC?.relationshipType).toBeUndefined();
  });
});
