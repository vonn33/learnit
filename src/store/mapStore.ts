import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import { supabase, type MapNodeRow, type MapEdgeRow } from '@/lib/supabase';

export interface MapNode {
  id: string;
  label: string;
  type: 'structural' | 'concept' | 'super-node';
  status: 'placed' | 'staged';
  position?: { x: number; y: number };
  annotationId?: string;
  linkedMapId?: string;
  confidence?: 'uncertain' | 'familiar' | 'mastered';
}

export interface MapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  direction: 'forward' | 'backward' | 'bidirectional';
  relationshipType?: 'causes' | 'supports' | 'contradicts' | 'is-a';
  note?: string;
}

export interface TopicMap {
  nodes: MapNode[];
  edges: MapEdge[];
}

type NewNode = Omit<MapNode, 'id'>;
type NewEdge = Omit<MapEdge, 'id'>;
type NodeUpdate = Partial<Pick<MapNode, 'label' | 'status' | 'position' | 'annotationId' | 'linkedMapId' | 'type' | 'confidence'>>;
type EdgeUpdate = Partial<Pick<MapEdge, 'relationshipType' | 'note' | 'label' | 'direction'>>;

interface MapStore {
  maps: Record<string, TopicMap>;

  initMap: (topicId: string) => void;
  fetchByTopic: (topicId: string) => Promise<void>;
  addNode: (topicId: string, node: NewNode) => Promise<string>;
  updateNode: (topicId: string, nodeId: string, patch: NodeUpdate) => Promise<void>;
  removeNode: (topicId: string, nodeId: string) => Promise<void>;
  addEdge: (topicId: string, edge: NewEdge) => Promise<string>;
  updateEdge: (topicId: string, edgeId: string, patch: EdgeUpdate) => Promise<void>;
  removeEdge: (topicId: string, edgeId: string) => Promise<void>;
  updateNodePositions: (topicId: string, positions: Record<string, { x: number; y: number }>) => Promise<void>;
  loadScaffold: (topicId: string, scaffold: Array<{ label: string; type: 'structural' }>) => Promise<void>;
  getStagedNodes: (topicId: string) => MapNode[];
  clearMap: (topicId: string) => Promise<void>;
  subscribeRealtime: () => () => void;
  reset: () => void;
}

const V_GAP = 80;
const H_OFFSET = 40;

function rowToNode(row: MapNodeRow): MapNode {
  const node: MapNode = {
    id: row.id,
    label: row.label,
    type: row.type,
    status: row.status,
    confidence: row.confidence,
  };
  // Only attach a position when the node is placed (mirrors the staged/placed model)
  if (row.status === 'placed') {
    node.position = { x: row.position_x, y: row.position_y };
  }
  if (row.source_annotation_id) {
    node.annotationId = row.source_annotation_id;
  }
  return node;
}

function nodeToRow(
  topicId: string,
  node: NewNode,
): Omit<MapNodeRow, 'id' | 'created_at' | 'user_id'> {
  return {
    topic_id: topicId,
    type: node.type,
    status: node.status,
    confidence: node.confidence ?? 'uncertain',
    label: node.label,
    position_x: node.position?.x ?? 0,
    position_y: node.position?.y ?? 0,
    source_annotation_id: node.annotationId ?? null,
  };
}

function rowToEdge(row: MapEdgeRow): MapEdge {
  const edge: MapEdge = {
    id: row.id,
    source: row.source_node_id,
    target: row.target_node_id,
    direction: 'forward',
  };
  if (row.label) edge.label = row.label;
  if (row.note) edge.note = row.note;
  if (row.relationship_type) edge.relationshipType = row.relationship_type;
  return edge;
}

function edgeToRow(
  topicId: string,
  edge: NewEdge,
): Omit<MapEdgeRow, 'id' | 'created_at' | 'user_id'> {
  return {
    topic_id: topicId,
    source_node_id: edge.source,
    target_node_id: edge.target,
    relationship_type: edge.relationshipType ?? null,
    label: edge.label ?? '',
    note: edge.note ?? '',
  };
}

function ensureMap(state: MapStore, topicId: string): TopicMap {
  return state.maps[topicId] ?? { nodes: [], edges: [] };
}

export const useMapStore = create<MapStore>((set, get) => ({
  maps: {},

  initMap: (topicId) => {
    if (get().maps[topicId]) return;
    set((s) => ({
      maps: { ...s.maps, [topicId]: { nodes: [], edges: [] } },
    }));
  },

  fetchByTopic: async (topicId) => {
    const [{ data: nodeRows, error: nodeErr }, { data: edgeRows, error: edgeErr }] =
      await Promise.all([
        supabase.from('map_nodes').select('*').eq('topic_id', topicId),
        supabase.from('map_edges').select('*').eq('topic_id', topicId),
      ]);
    if (nodeErr || edgeErr) return;
    const nodes = (nodeRows ?? []).map((r) => rowToNode(r as MapNodeRow));
    const edges = (edgeRows ?? []).map((r) => rowToEdge(r as MapEdgeRow));
    set((s) => ({
      maps: { ...s.maps, [topicId]: { nodes, edges } },
    }));
  },

  addNode: async (topicId, node) => {
    const row = nodeToRow(topicId, node);
    const { data, error } = await supabase
      .from('map_nodes')
      .insert(row)
      .select()
      .single();

    let mapNode: MapNode;
    if (error || !data) {
      // Fallback: still add to local state with a synthesized id so the UI
      // doesn't desync if Supabase is unreachable in the test/mock path.
      mapNode = { ...node, id: uuid() };
    } else {
      mapNode = rowToNode(data as MapNodeRow);
      // Preserve domain-only fields the DB doesn't store
      if (node.linkedMapId) mapNode.linkedMapId = node.linkedMapId;
    }

    set((s) => {
      const map = ensureMap(s, topicId);
      return {
        maps: {
          ...s.maps,
          [topicId]: { ...map, nodes: [...map.nodes, mapNode] },
        },
      };
    });
    return mapNode.id;
  },

  updateNode: async (topicId, nodeId, patch) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.label !== undefined) dbPatch.label = patch.label;
    if (patch.type !== undefined) dbPatch.type = patch.type;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.confidence !== undefined) dbPatch.confidence = patch.confidence;
    if (patch.position !== undefined) {
      dbPatch.position_x = patch.position.x;
      dbPatch.position_y = patch.position.y;
    }
    if (patch.annotationId !== undefined) {
      dbPatch.source_annotation_id = patch.annotationId ?? null;
    }

    if (Object.keys(dbPatch).length > 0) {
      await supabase.from('map_nodes').update(dbPatch).eq('id', nodeId);
    }

    set((s) => {
      const map = s.maps[topicId];
      if (!map) return s;
      return {
        maps: {
          ...s.maps,
          [topicId]: {
            ...map,
            nodes: map.nodes.map((n) =>
              n.id === nodeId ? { ...n, ...patch } : n,
            ),
          },
        },
      };
    });
  },

  removeNode: async (topicId, nodeId) => {
    // Remove the node and any edges referencing it (DB)
    await supabase
      .from('map_edges')
      .delete()
      .eq('source_node_id', nodeId);
    await supabase
      .from('map_edges')
      .delete()
      .eq('target_node_id', nodeId);
    await supabase.from('map_nodes').delete().eq('id', nodeId);

    set((s) => {
      const map = s.maps[topicId];
      if (!map) return s;
      return {
        maps: {
          ...s.maps,
          [topicId]: {
            nodes: map.nodes.filter((n) => n.id !== nodeId),
            edges: map.edges.filter(
              (e) => e.source !== nodeId && e.target !== nodeId,
            ),
          },
        },
      };
    });
  },

  addEdge: async (topicId, edge) => {
    const row = edgeToRow(topicId, edge);
    const { data, error } = await supabase
      .from('map_edges')
      .insert(row)
      .select()
      .single();

    let mapEdge: MapEdge;
    if (error || !data) {
      mapEdge = { ...edge, id: uuid() };
    } else {
      const fromRow = rowToEdge(data as MapEdgeRow);
      // direction is domain-only; preserve from the input
      mapEdge = { ...fromRow, direction: edge.direction };
    }

    set((s) => {
      const map = ensureMap(s, topicId);
      return {
        maps: {
          ...s.maps,
          [topicId]: { ...map, edges: [...map.edges, mapEdge] },
        },
      };
    });
    return mapEdge.id;
  },

  updateEdge: async (topicId, edgeId, patch) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.relationshipType !== undefined) {
      dbPatch.relationship_type = patch.relationshipType ?? null;
    }
    if (patch.label !== undefined) dbPatch.label = patch.label ?? '';
    if (patch.note !== undefined) dbPatch.note = patch.note ?? '';

    if (Object.keys(dbPatch).length > 0) {
      await supabase.from('map_edges').update(dbPatch).eq('id', edgeId);
    }

    set((s) => {
      const map = s.maps[topicId];
      if (!map) return s;
      return {
        maps: {
          ...s.maps,
          [topicId]: {
            ...map,
            edges: map.edges.map((e) =>
              e.id === edgeId ? { ...e, ...patch } : e,
            ),
          },
        },
      };
    });
  },

  removeEdge: async (topicId, edgeId) => {
    await supabase.from('map_edges').delete().eq('id', edgeId);
    set((s) => {
      const map = s.maps[topicId];
      if (!map) return s;
      return {
        maps: {
          ...s.maps,
          [topicId]: {
            ...map,
            edges: map.edges.filter((e) => e.id !== edgeId),
          },
        },
      };
    });
  },

  updateNodePositions: async (topicId, positions) => {
    const ids = Object.keys(positions);
    await Promise.all(
      ids.map((id) =>
        supabase
          .from('map_nodes')
          .update({ position_x: positions[id].x, position_y: positions[id].y })
          .eq('id', id),
      ),
    );
    set((s) => {
      const map = s.maps[topicId];
      if (!map) return s;
      return {
        maps: {
          ...s.maps,
          [topicId]: {
            ...map,
            nodes: map.nodes.map((n) =>
              positions[n.id]
                ? { ...n, position: positions[n.id] }
                : n,
            ),
          },
        },
      };
    });
  },

  loadScaffold: async (topicId, scaffold) => {
    const newNodes: MapNode[] = scaffold.map((s, i) => ({
      id: uuid(),
      label: s.label,
      type: s.type,
      status: 'placed' as const,
      position: { x: H_OFFSET, y: i * V_GAP + 40 },
    }));

    // Best-effort persist scaffold rows; ignore errors so the UI still seeds.
    if (newNodes.length > 0) {
      const rows = newNodes.map((n) => ({
        id: n.id,
        topic_id: topicId,
        type: n.type,
        status: n.status,
        confidence: 'uncertain' as const,
        label: n.label,
        position_x: n.position?.x ?? 0,
        position_y: n.position?.y ?? 0,
        source_annotation_id: null,
      }));
      await supabase.from('map_nodes').insert(rows);
    }

    set((state) => ({
      maps: {
        ...state.maps,
        [topicId]: { nodes: newNodes, edges: [] },
      },
    }));
  },

  getStagedNodes: (topicId) => {
    const map = get().maps[topicId];
    if (!map) return [];
    return map.nodes.filter((n) => n.status === 'staged');
  },

  clearMap: async (topicId) => {
    if (!get().maps[topicId]) return;
    await supabase.from('map_edges').delete().eq('topic_id', topicId);
    await supabase.from('map_nodes').delete().eq('topic_id', topicId);
    set((s) => {
      if (!s.maps[topicId]) return s;
      return {
        maps: {
          ...s.maps,
          [topicId]: { nodes: [], edges: [] },
        },
      };
    });
  },

  subscribeRealtime: () => {
    const nodeChannel = supabase
      .channel('map-nodes-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'map_nodes' }, (p) => {
        const row = p.new as MapNodeRow;
        const node = rowToNode(row);
        set((s) => {
          const map = ensureMap(s, row.topic_id);
          if (map.nodes.find((n) => n.id === node.id)) return s;
          return {
            maps: {
              ...s.maps,
              [row.topic_id]: { ...map, nodes: [...map.nodes, node] },
            },
          };
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'map_nodes' }, (p) => {
        const row = p.new as MapNodeRow;
        const node = rowToNode(row);
        set((s) => {
          const map = s.maps[row.topic_id];
          if (!map) return s;
          return {
            maps: {
              ...s.maps,
              [row.topic_id]: {
                ...map,
                nodes: map.nodes.map((n) => (n.id === node.id ? { ...n, ...node } : n)),
              },
            },
          };
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'map_nodes' }, (p) => {
        const old = p.old as { id: string; topic_id?: string };
        set((s) => {
          const updated: Record<string, TopicMap> = {};
          for (const [tid, map] of Object.entries(s.maps)) {
            updated[tid] = {
              nodes: map.nodes.filter((n) => n.id !== old.id),
              edges: map.edges.filter(
                (e) => e.source !== old.id && e.target !== old.id,
              ),
            };
          }
          return { maps: updated };
        });
      })
      .subscribe();

    const edgeChannel = supabase
      .channel('map-edges-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'map_edges' }, (p) => {
        const row = p.new as MapEdgeRow;
        const edge = rowToEdge(row);
        set((s) => {
          const map = ensureMap(s, row.topic_id);
          if (map.edges.find((e) => e.id === edge.id)) return s;
          return {
            maps: {
              ...s.maps,
              [row.topic_id]: { ...map, edges: [...map.edges, edge] },
            },
          };
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'map_edges' }, (p) => {
        const row = p.new as MapEdgeRow;
        const edge = rowToEdge(row);
        set((s) => {
          const map = s.maps[row.topic_id];
          if (!map) return s;
          return {
            maps: {
              ...s.maps,
              [row.topic_id]: {
                ...map,
                edges: map.edges.map((e) => (e.id === edge.id ? { ...e, ...edge } : e)),
              },
            },
          };
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'map_edges' }, (p) => {
        const old = p.old as { id: string };
        set((s) => {
          const updated: Record<string, TopicMap> = {};
          for (const [tid, map] of Object.entries(s.maps)) {
            updated[tid] = {
              nodes: map.nodes,
              edges: map.edges.filter((e) => e.id !== old.id),
            };
          }
          return { maps: updated };
        });
      })
      .subscribe();

    return () => {
      nodeChannel.unsubscribe();
      edgeChannel.unsubscribe();
    };
  },

  reset: () => set({ maps: {} }),
}));
