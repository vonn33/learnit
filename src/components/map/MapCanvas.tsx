import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
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

const nodeTypes = { concept: ConceptNode };

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
      },
    }));
}

function toFlowEdges(mapEdges: MapEdge[]): Edge[] {
  return mapEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    markerEnd:
      e.direction !== 'backward'
        ? { type: MarkerType.ArrowClosed }
        : undefined,
    markerStart:
      e.direction === 'backward' || e.direction === 'bidirectional'
        ? { type: MarkerType.ArrowClosed }
        : undefined,
  }));
}

interface MapCanvasProps {
  topicId: string;
  onNodeClick?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
}

export function MapCanvas({ topicId, onNodeClick, onNodeDoubleClick }: MapCanvasProps) {
  const maps = useMapStore((s) => s.maps);
  const initMap = useMapStore((s) => s.initMap);
  const loadScaffold = useMapStore((s) => s.loadScaffold);
  const updateNodePositions = useMapStore((s) => s.updateNodePositions);
  const storeAddEdge = useMapStore((s) => s.addEdge);
  const updateNode = useMapStore((s) => s.updateNode);
  const removeNode = useMapStore((s) => s.removeNode);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(false);

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

  const handleNodeClick = useCallback(
    (_: unknown, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick],
  );

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
    const handler = (e: Event) => {
      const { nodeId } = (e as CustomEvent).detail as { nodeId: string };
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          className: n.id === nodeId ? 'ring-2 ring-primary animate-pulse' : '',
        })),
      );
      setTimeout(() => {
        setNodes((nds) => nds.map((n) => ({ ...n, className: '' })));
      }, 2000);
    };
    window.addEventListener('focus-map-node', handler);
    return () => window.removeEventListener('focus-map-node', handler);
  }, [setNodes]);

  return (
    <div className="h-full w-full" onClick={() => setContextMenu(null)}>
      <MapToolbar snapToGrid={snapToGrid} onToggleSnap={() => setSnapToGrid(!snapToGrid)} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={() => setContextMenu(null)}
        onKeyDown={onKeyDown}
        nodeTypes={nodeTypes}
        snapToGrid={snapToGrid}
        snapGrid={[16, 16]}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>

      {contextMenu && (
        <div
          className="fixed bg-card border border-border rounded-lg shadow-lg py-1 z-50 min-w-[140px]"
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
        </div>
      )}
    </div>
  );
}
