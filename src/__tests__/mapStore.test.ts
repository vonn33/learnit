import { describe, it, expect, beforeEach } from 'vitest';
import { useMapStore } from '@/store/mapStore';

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

  it('adds a placed node', () => {
    useMapStore.getState().initMap('topic-1');
    useMapStore.getState().addNode('topic-1', {
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

  it('adds a staged node (quick capture)', () => {
    useMapStore.getState().initMap('topic-1');
    useMapStore.getState().addNode('topic-1', {
      label: 'Important idea',
      type: 'concept',
      status: 'staged',
    });

    const nodes = useMapStore.getState().maps['topic-1'].nodes;
    expect(nodes[0].status).toBe('staged');
    expect(nodes[0].position).toBeUndefined();
  });

  it('promotes a staged node to placed', () => {
    useMapStore.getState().initMap('topic-1');
    const nodeId = useMapStore.getState().addNode('topic-1', {
      label: 'Staged idea',
      type: 'concept',
      status: 'staged',
    });

    useMapStore.getState().updateNode('topic-1', nodeId, {
      status: 'placed',
      position: { x: 50, y: 50 },
    });

    const node = useMapStore.getState().maps['topic-1'].nodes[0];
    expect(node.status).toBe('placed');
    expect(node.position).toEqual({ x: 50, y: 50 });
  });

  it('adds an edge between nodes', () => {
    useMapStore.getState().initMap('topic-1');
    const n1 = useMapStore.getState().addNode('topic-1', {
      label: 'A', type: 'concept', status: 'placed', position: { x: 0, y: 0 },
    });
    const n2 = useMapStore.getState().addNode('topic-1', {
      label: 'B', type: 'concept', status: 'placed', position: { x: 100, y: 0 },
    });

    useMapStore.getState().addEdge('topic-1', {
      source: n1,
      target: n2,
      direction: 'forward',
    });

    const edges = useMapStore.getState().maps['topic-1'].edges;
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe(n1);
    expect(edges[0].target).toBe(n2);
  });

  it('removes a node and its connected edges', () => {
    useMapStore.getState().initMap('t');
    const n1 = useMapStore.getState().addNode('t', {
      label: 'A', type: 'concept', status: 'placed', position: { x: 0, y: 0 },
    });
    const n2 = useMapStore.getState().addNode('t', {
      label: 'B', type: 'concept', status: 'placed', position: { x: 100, y: 0 },
    });
    useMapStore.getState().addEdge('t', { source: n1, target: n2, direction: 'forward' });

    useMapStore.getState().removeNode('t', n1);

    expect(useMapStore.getState().maps['t'].nodes).toHaveLength(1);
    expect(useMapStore.getState().maps['t'].edges).toHaveLength(0);
  });

  it('loads scaffold nodes into a map', () => {
    const scaffold = [
      { label: 'Chapter 1', type: 'structural' as const },
      { label: 'Chapter 2', type: 'structural' as const },
    ];
    useMapStore.getState().loadScaffold('topic-1', scaffold);

    const map = useMapStore.getState().maps['topic-1'];
    expect(map.nodes).toHaveLength(2);
    expect(map.nodes[0].type).toBe('structural');
    expect(map.nodes[0].status).toBe('placed');
    expect(map.nodes[0].position).toBeDefined();
  });

  it('returns staged nodes for a topic', () => {
    useMapStore.getState().initMap('t');
    useMapStore.getState().addNode('t', { label: 'A', type: 'concept', status: 'placed', position: { x: 0, y: 0 } });
    useMapStore.getState().addNode('t', { label: 'B', type: 'concept', status: 'staged' });
    useMapStore.getState().addNode('t', { label: 'C', type: 'concept', status: 'staged' });

    const staged = useMapStore.getState().getStagedNodes('t');
    expect(staged).toHaveLength(2);
  });
});

describe('drag-to-canvas (store)', () => {
  it('promotes staged node to placed with a given position', () => {
    useMapStore.getState().initMap('t');
    const nodeId = useMapStore.getState().addNode('t', {
      label: 'Captured idea',
      type: 'concept',
      status: 'staged',
    });

    // Simulate what onDrop calls after coordinate conversion
    useMapStore.getState().updateNode('t', nodeId, {
      status: 'placed',
      position: { x: 320, y: 180 },
    });

    const node = useMapStore.getState().maps['t'].nodes[0];
    expect(node.status).toBe('placed');
    expect(node.position).toEqual({ x: 320, y: 180 });
  });
});

describe('confidence states', () => {
  it('sets confidence on a node via updateNode', () => {
    useMapStore.getState().initMap('t');
    const nodeId = useMapStore.getState().addNode('t', {
      label: 'Spaced Repetition',
      type: 'concept',
      status: 'placed',
      position: { x: 0, y: 0 },
    });

    useMapStore.getState().updateNode('t', nodeId, { confidence: 'familiar' });

    const node = useMapStore.getState().maps['t'].nodes[0];
    expect(node.confidence).toBe('familiar');
  });

  it('clears confidence when set to undefined', () => {
    useMapStore.getState().initMap('t');
    const nodeId = useMapStore.getState().addNode('t', {
      label: 'Node',
      type: 'concept',
      status: 'placed',
      position: { x: 0, y: 0 },
    });

    useMapStore.getState().updateNode('t', nodeId, { confidence: 'mastered' });
    useMapStore.getState().updateNode('t', nodeId, { confidence: undefined });

    const node = useMapStore.getState().maps['t'].nodes[0];
    expect(node.confidence).toBeUndefined();
  });

  it('confidence does not affect other node fields', () => {
    useMapStore.getState().initMap('t');
    const nodeId = useMapStore.getState().addNode('t', {
      label: 'Node',
      type: 'concept',
      status: 'placed',
      position: { x: 10, y: 20 },
    });

    useMapStore.getState().updateNode('t', nodeId, { confidence: 'uncertain' });

    const node = useMapStore.getState().maps['t'].nodes[0];
    expect(node.label).toBe('Node');
    expect(node.position).toEqual({ x: 10, y: 20 });
  });
});
