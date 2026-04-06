import {useCallback, useEffect, useRef, useState} from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {type DiagramData, loadDiagram, saveLayout, resetLayout} from '@/lib/diagrams';
import type {DiagramNode, DiagramEdge} from '@/lib/diagrams';

interface ConceptMapProps {
  pageId: string;
  src: string;
  height?: number;
}

function toFlowNodes(nodes: DiagramNode[], draggable: boolean): Node[] {
  return nodes.map((n) => ({...n, draggable}));
}

function toFlowEdges(edges: DiagramEdge[]): Edge[] {
  return edges.map((e) => ({...e, markerEnd: {type: MarkerType.ArrowClosed}}));
}

export function ConceptMap({pageId, src, height = 420}: ConceptMapProps) {
  const [defaultData, setDefaultData] = useState<DiagramData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`Diagram not found: ${src}`);
        return r.json();
      })
      .then((data: DiagramData) => {
        setDefaultData(data);
        const loaded = loadDiagram(pageId, data);
        setNodes(toFlowNodes(loaded.nodes, false));
        setEdges(toFlowEdges(loaded.edges));
      })
      .catch((e: unknown) => setError(String(e)));
  }, [pageId, src]);

  useEffect(() => {
    setNodes((ns) => ns.map((n) => ({...n, draggable: isEditing})));
  }, [isEditing]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      onNodesChange(changes);
      if (!isEditing) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setNodes((ns) => {
          saveLayout(
            pageId,
            ns.map((n) => ({id: n.id, position: n.position, data: n.data as {label: string}, type: n.type})),
            edges.map((e) => ({id: e.id, source: e.source, target: e.target, label: e.label as string | undefined})),
          );
          return ns;
        });
      }, 800);
    },
    [isEditing, pageId, edges, onNodesChange, setNodes],
  );

  function handleReset() {
    if (!defaultData) return;
    resetLayout(pageId);
    setNodes(toFlowNodes(defaultData.nodes, isEditing));
    setEdges(toFlowEdges(defaultData.edges));
  }

  if (error) return null;

  return (
    <div
      className="my-4 rounded-lg border overflow-hidden relative"
      style={{height}}
    >
      <div className="absolute top-2 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <span className="text-xs font-medium text-[var(--color-muted-foreground)]">Concept Map</span>
        <div className="flex gap-1.5 pointer-events-auto">
          <button
            className={[
              'text-xs px-2.5 py-1 rounded border transition-colors',
              isEditing
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-transparent'
                : 'bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] border-[var(--color-border)]',
            ].join(' ')}
            onClick={() => setIsEditing((v) => !v)}
          >
            {isEditing ? 'Done' : 'Edit'}
          </button>
          {isEditing && (
            <button
              className="text-xs px-2.5 py-1 rounded border bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] border-[var(--color-border)] transition-colors"
              onClick={handleReset}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        proOptions={{hideAttribution: true}}
        nodesDraggable={isEditing}
        nodesConnectable={false}
        elementsSelectable={isEditing}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
