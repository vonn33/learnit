import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';

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
  addNode: (topicId: string, node: NewNode) => string;
  updateNode: (topicId: string, nodeId: string, patch: NodeUpdate) => void;
  removeNode: (topicId: string, nodeId: string) => void;
  addEdge: (topicId: string, edge: NewEdge) => string;
  updateEdge: (topicId: string, edgeId: string, patch: EdgeUpdate) => void;
  removeEdge: (topicId: string, edgeId: string) => void;
  updateNodePositions: (topicId: string, positions: Record<string, { x: number; y: number }>) => void;
  loadScaffold: (topicId: string, scaffold: Array<{ label: string; type: 'structural' }>) => void;
  getStagedNodes: (topicId: string) => MapNode[];
  reset: () => void;
}

const V_GAP = 80;
const H_OFFSET = 40;

export const useMapStore = create<MapStore>()(
  persist(
    (set, get) => ({
      maps: {},

      initMap: (topicId) => {
        if (get().maps[topicId]) return;
        set((s) => ({
          maps: { ...s.maps, [topicId]: { nodes: [], edges: [] } },
        }));
      },

      addNode: (topicId, node) => {
        const id = uuid();
        const mapNode: MapNode = { ...node, id };
        set((s) => {
          const map = s.maps[topicId] ?? { nodes: [], edges: [] };
          return {
            maps: {
              ...s.maps,
              [topicId]: { ...map, nodes: [...map.nodes, mapNode] },
            },
          };
        });
        return id;
      },

      updateNode: (topicId, nodeId, patch) => {
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

      removeNode: (topicId, nodeId) => {
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

      addEdge: (topicId, edge) => {
        const id = uuid();
        const mapEdge: MapEdge = { ...edge, id };
        set((s) => {
          const map = s.maps[topicId] ?? { nodes: [], edges: [] };
          return {
            maps: {
              ...s.maps,
              [topicId]: { ...map, edges: [...map.edges, mapEdge] },
            },
          };
        });
        return id;
      },

      updateEdge: (topicId, edgeId, patch) => {
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

      removeEdge: (topicId, edgeId) => {
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

      updateNodePositions: (topicId, positions) => {
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

      loadScaffold: (topicId, scaffold) => {
        const nodes: MapNode[] = scaffold.map((s, i) => ({
          id: uuid(),
          label: s.label,
          type: s.type,
          status: 'placed' as const,
          position: { x: H_OFFSET, y: i * V_GAP + 40 },
        }));
        set((state) => ({
          maps: {
            ...state.maps,
            [topicId]: { nodes, edges: [] },
          },
        }));
      },

      getStagedNodes: (topicId) => {
        const map = get().maps[topicId];
        if (!map) return [];
        return map.nodes.filter((n) => n.status === 'staged');
      },

      reset: () => set({ maps: {} }),
    }),
    { name: 'handbook:maps' },
  ),
);
