import React, { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  BackgroundVariant,
  MarkerType,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMapStore, type MapNode, type MapEdge } from '@/store/mapStore';
import { generateScaffold } from '@/lib/mapScaffold';
import manifest from '@/data/content-manifest.json';
import { ConceptNode } from './ConceptNode';
import { MapToolbar } from './MapToolbar';
import { ExplosionOverlay } from './ExplosionOverlay';
import { EdgePopover } from './EdgePopover';

const nodeTypes = { concept: ConceptNode };

// Private inner component — must be rendered as a child of <ReactFlow> to access useReactFlow()
function DropHandler({
  converterRef,
}: {
  converterRef: RefObject<((x: number, y: number) => { x: number; y: number }) | null>;
}) {
  const { screenToFlowPosition } = useReactFlow();
  useEffect(() => {
    converterRef.current = (x, y) => screenToFlowPosition({ x, y });
  }, [converterRef, screenToFlowPosition]);
  return null;
}

function toFlowNodes(mapNodes: MapNode[]): Node[] {
  return mapNodes
    .filter((n) => n.status === 'placed' && n.position)
    .map((n) => ({
      id: n.id,
      type: 'concept',
      position: n.position!,
      data: {
        label: n.label,
        nodeType: n.type,
        hasAnnotation: !!n.annotationId,
        confidence: n.confidence,
      },
    }));
}

export function edgeStyle(type?: MapEdge['relationshipType']): {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  markerType: MarkerType;
} {
  switch (type) {
    case 'causes':      return { stroke: '#f97316', strokeWidth: 2, markerType: MarkerType.ArrowClosed };
    case 'supports':    return { stroke: '#22c55e', strokeWidth: 2, markerType: MarkerType.ArrowClosed };
    case 'contradicts': return { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '6,3', markerType: MarkerType.ArrowClosed };
    case 'is-a':        return { stroke: '#a78bfa', strokeWidth: 1.5, markerType: MarkerType.Arrow };
    default:            return { stroke: '#334155', strokeWidth: 1.5, strokeDasharray: '3,3', markerType: MarkerType.ArrowClosed };
  }
}

function toFlowEdges(mapEdges: MapEdge[]): Edge[] {
  return mapEdges.map((e) => {
    const { stroke, strokeWidth, strokeDasharray, markerType } = edgeStyle(e.relationshipType);
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      style: { stroke, strokeWidth, strokeDasharray },
      markerEnd:
        e.direction !== 'backward'
          ? { type: markerType, color: stroke }
          : undefined,
      markerStart:
        e.direction === 'backward' || e.direction === 'bidirectional'
          ? { type: markerType, color: stroke }
          : undefined,
    };
  });
}

interface MapCanvasProps {
  topicId: string;
  onAnnotationJump?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
}

export function MapCanvas({ topicId, onAnnotationJump, onNodeDoubleClick }: MapCanvasProps) {
  const maps = useMapStore((s) => s.maps);
  const initMap = useMapStore((s) => s.initMap);
  const loadScaffold = useMapStore((s) => s.loadScaffold);
  const updateNodePositions = useMapStore((s) => s.updateNodePositions);
  const storeAddEdge = useMapStore((s) => s.addEdge);
  const updateNode = useMapStore((s) => s.updateNode);
  const removeNode = useMapStore((s) => s.removeNode);
  const clearMap = useMapStore((s) => s.clearMap);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [explodedNodeId, setExplodedNodeId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<{ id: string; x: number; y: number } | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const screenToFlowRef = useRef<((x: number, y: number) => { x: number; y: number }) | null>(null);

  // Initialize map from scaffold on first open
  useEffect(() => {
    if (maps[topicId]) return;
    const scaffold = generateScaffold(
      manifest as Parameters<typeof generateScaffold>[0],
      topicId,
    );
    if (scaffold.length > 0) {
      loadScaffold(topicId, scaffold);
    } else {
      initMap(topicId);
    }
  }, [topicId, maps, initMap, loadScaffold]);

  const topicMap = maps[topicId];
  const initialNodes = useMemo(() => (topicMap ? toFlowNodes(topicMap.nodes) : []), [topicMap]);
  const initialEdges = useMemo(() => (topicMap ? toFlowEdges(topicMap.edges) : []), [topicMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync from store when topicMap changes externally (e.g. new node added via popup)
  useEffect(() => {
    if (!topicMap) return;
    setNodes(toFlowNodes(topicMap.nodes));
    setEdges(toFlowEdges(topicMap.edges));
  }, [topicMap, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, markerEnd: { type: MarkerType.ArrowClosed } }, eds));
      if (connection.source && connection.target) {
        storeAddEdge(topicId, {
          source: connection.source,
          target: connection.target,
          direction: 'forward',
        });
      }
    },
    [setEdges, storeAddEdge, topicId],
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      updateNodePositions(topicId, { [node.id]: { x: node.position.x, y: node.position.y } });
    },
    [updateNodePositions, topicId],
  );

  const onNodeMouseEnter = useCallback((_: unknown, node: Node) => {
    setHoveredNodeId(node.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeId = event.dataTransfer.getData('nodeId');
      if (!nodeId || !screenToFlowRef.current) return;
      const flowPos = screenToFlowRef.current(event.clientX, event.clientY);
      updateNode(topicId, nodeId, { status: 'placed', position: flowPos });
    },
    [topicId, updateNode],
  );

  const handleNodeClick = useCallback(
    (_: unknown, node: Node) => {
      setExplodedNodeId(node.id);
    },
    [],
  );

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge({ id: edge.id, x: event.clientX, y: event.clientY });
  }, []);

  const handleNodeDoubleClick = useCallback(
    (_: unknown, node: Node) => {
      onNodeDoubleClick?.(node.id);
    },
    [onNodeDoubleClick],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
    },
    [],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodes = nodes.filter((n) => n.selected);
        selectedNodes.forEach((n) => removeNode(topicId, n.id));
      }
    },
    [nodes, removeNode, topicId],
  );

  // Listen for focus-map-node events from the reader (bi-directional linking)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: Event) => {
      const { nodeId } = (e as CustomEvent).detail as { nodeId: string };
      setFocusedNodeId(nodeId);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setFocusedNodeId(null), 2000);
    };
    window.addEventListener('focus-map-node', handler);
    return () => {
      window.removeEventListener('focus-map-node', handler);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Apply className from hover + focus state — single source of truth
  useEffect(() => {
    setNodes((nds) => {
      const neighborIds = new Set<string>();
      if (hoveredNodeId) {
        for (const e of edges) {
          if (e.source === hoveredNodeId) neighborIds.add(e.target);
          if (e.target === hoveredNodeId) neighborIds.add(e.source);
        }
      }
      return nds.map((n) => {
        let className = '';
        if (n.id === focusedNodeId) {
          className = 'ring-2 ring-primary animate-pulse';
        } else if (n.id === hoveredNodeId) {
          className = 'ring-2 ring-primary/60';
        } else if (hoveredNodeId && !neighborIds.has(n.id)) {
          className = 'opacity-30 transition-opacity';
        }
        return n.className === className ? n : { ...n, className };
      });
    });
  }, [hoveredNodeId, focusedNodeId, edges, setNodes]);

  return (
    <div
      className="h-full w-full"
      onClick={() => setContextMenu(null)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <MapToolbar
        snapToGrid={snapToGrid}
        onToggleSnap={() => setSnapToGrid(!snapToGrid)}
        onClearMap={() => {
          if (window.confirm('Clear all nodes and edges from this map? This cannot be undone.')) {
            clearMap(topicId);
          }
        }}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeClick={onEdgeClick}
        onPaneClick={() => { setContextMenu(null); setSelectedEdge(null); }}
        onKeyDown={onKeyDown}
        nodeTypes={nodeTypes}
        snapToGrid={snapToGrid}
        snapGrid={[16, 16]}
        fitView
        connectionRadius={30}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} />
        <DropHandler converterRef={screenToFlowRef} />
        {explodedNodeId && (
          <ExplosionOverlay
            nodeId={explodedNodeId}
            topicId={topicId}
            onClose={() => setExplodedNodeId(null)}
            onAnnotationJump={(nId) => {
              onAnnotationJump?.(nId);
              setExplodedNodeId(null);
            }}
            onChildClick={(nId) => setExplodedNodeId(nId)}
          />
        )}
      </ReactFlow>

      {contextMenu && (
        <div
          className="fixed bg-card border border-border rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const label = prompt('Rename node:', '');
              if (label) updateNode(topicId, contextMenu.nodeId, { label });
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
          >
            Rename
          </button>
          <button
            onClick={() => {
              removeNode(topicId, contextMenu.nodeId);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted text-destructive"
          >
            Delete
          </button>
          <div className="border-t border-border my-1" />
          {(() => {
            const currentNode = topicMap?.nodes.find((n) => n.id === contextMenu.nodeId);
            return (['uncertain', 'familiar', 'mastered'] as const).map((level) => {
              const dotColor = level === 'uncertain' ? 'bg-red-500' : level === 'familiar' ? 'bg-amber-500' : 'bg-green-500';
              const label = level === 'uncertain' ? 'Mark uncertain' : level === 'familiar' ? 'Mark familiar' : 'Mark mastered';
              const isActive = currentNode?.confidence === level;
              return (
                <button
                  key={level}
                  onClick={() => {
                    updateNode(topicId, contextMenu.nodeId, {
                      confidence: isActive ? undefined : level,
                    });
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                  <span className="flex-1">{label}</span>
                  {isActive && <span className="text-xs text-primary">✓</span>}
                </button>
              );
            });
          })()}
        </div>
      )}

      {selectedEdge && (
        <EdgePopover
          edgeId={selectedEdge.id}
          topicId={topicId}
          position={{ x: selectedEdge.x, y: selectedEdge.y }}
          onClose={() => setSelectedEdge(null)}
        />
      )}
    </div>
  );
}
