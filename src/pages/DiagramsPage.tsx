import {useCallback, useEffect, useRef, useState} from 'react';
import {useParams, useNavigate, Routes, Route} from 'react-router';
import {v4 as uuidv4} from 'uuid';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type Node,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {type UserDiagram, getUserDiagrams, upsertUserDiagram, deleteUserDiagram} from '@/lib/storage';
import {DIAGRAM_PRESETS, type DiagramPreset} from '@/data/diagramPresets';
import {autoLayout} from '@/lib/autoLayout';
import {useUndoRedo} from '@/lib/useUndoRedo';
import {Plus, GitBranch, Trash2, ArrowLeft, Undo2, Redo2, LayoutDashboard} from 'lucide-react';
import type {DiagramNode, DiagramEdge} from '@/lib/diagrams';

type FlowNode = Node<{label: string}>;
type FlowEdge = Edge;

// ── Diagram List ──

function DiagramCard({diagram, onDelete}: {diagram: UserDiagram; onDelete: () => void}) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirmDelete) {
      if (timer.current) clearTimeout(timer.current);
      deleteUserDiagram(diagram.id);
      onDelete();
    } else {
      setConfirmDelete(true);
      timer.current = setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  return (
    <div
      className="rounded-xl border bg-[var(--color-card)] p-4 cursor-pointer hover:border-[var(--color-ring)] transition-colors group"
      onClick={() => navigate(`/diagrams/${diagram.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">{diagram.title}</h3>
          <span className="text-[10px] text-[var(--color-muted-foreground)] bg-[var(--color-muted)] px-1.5 py-0.5 rounded-full mt-1 inline-block">
            {DIAGRAM_PRESETS.find((p) => p.id === diagram.preset)?.label ?? diagram.preset}
          </span>
        </div>
        <button
          onClick={handleDelete}
          className={[
            'opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded text-xs',
            confirmDelete ? 'text-red-400 bg-red-500/10' : 'text-[var(--color-muted-foreground)] hover:text-red-400',
          ].join(' ')}
          aria-label="Delete diagram"
        >
          {confirmDelete ? 'Confirm?' : <Trash2 size={13} />}
        </button>
      </div>
      <div className="text-[10px] text-[var(--color-muted-foreground)] flex gap-3">
        <span>{diagram.nodes.length} nodes</span>
        <span>{diagram.edges.length} edges</span>
        <span>Updated {new Date(diagram.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function PresetPicker({onSelect}: {onSelect: (preset: DiagramPreset) => void}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {DIAGRAM_PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset)}
          className="text-left rounded-xl border bg-[var(--color-card)] p-4 hover:border-[var(--color-ring)] hover:bg-[var(--color-accent)] transition-colors"
        >
          <div className="text-sm font-semibold text-[var(--color-foreground)] mb-1">{preset.label}</div>
          <div className="text-xs text-[var(--color-muted-foreground)]">{preset.description}</div>
        </button>
      ))}
    </div>
  );
}

function DiagramList() {
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState<UserDiagram[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    setDiagrams(getUserDiagrams());
  }, []);

  function handlePresetSelect(preset: DiagramPreset) {
    const diagram: UserDiagram = {
      id: uuidv4(),
      title: `Untitled ${preset.label}`,
      preset: preset.id,
      nodes: preset.nodes,
      edges: preset.edges,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    upsertUserDiagram(diagram);
    navigate(`/diagrams/${diagram.id}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-foreground)]">
          Diagrams
          <span className="ml-2 text-sm font-normal text-[var(--color-muted-foreground)]">{diagrams.length}</span>
        </h1>
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          New diagram
        </button>
      </div>

      {showPicker && (
        <div className="mb-6 p-4 rounded-xl border bg-[var(--color-card)]">
          <div className="text-sm font-semibold text-[var(--color-foreground)] mb-3">Choose a template</div>
          <PresetPicker onSelect={handlePresetSelect} />
        </div>
      )}

      {diagrams.length === 0 && !showPicker ? (
        <div className="text-center py-16 text-[var(--color-muted-foreground)] text-sm flex flex-col items-center gap-3">
          <GitBranch size={32} className="opacity-30" />
          No diagrams yet. Create one from a template.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {diagrams.map((d) => (
            <DiagramCard
              key={d.id}
              diagram={d}
              onDelete={() => setDiagrams(getUserDiagrams())}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Diagram Editor ──

function DiagramEditor() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const [diagram, setDiagram] = useState<UserDiagram | null>(null);
  const [title, setTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);

  const {state: history, set: setHistory, undo, redo} = useUndoRedo<{
    nodes: FlowNode[];
    edges: FlowEdge[];
  }>({nodes: [], edges: []});

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    const d = getUserDiagrams().find((x) => x.id === id);
    if (!d) {navigate('/diagrams'); return;}
    setDiagram(d);
    setTitle(d.title);
    const flowNodes = d.nodes.map((n) => ({...n, data: {label: n.data.label}})) as FlowNode[];
    const flowEdges = d.edges as FlowEdge[];
    setNodes(flowNodes);
    setEdges(flowEdges);
    setHistory({nodes: flowNodes, edges: flowEdges});
  }, [id]);

  function scheduleSave(updatedNodes: FlowNode[], updatedEdges: FlowEdge[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!diagram) return;
      upsertUserDiagram({
        ...diagram,
        nodes: updatedNodes.map((n) => ({id: n.id, position: n.position, data: {label: n.data.label}, type: n.type})),
        edges: updatedEdges.map((e) => ({id: e.id, source: e.source, target: e.target, label: e.label as string | undefined})),
        updatedAt: new Date().toISOString(),
      });
    }, 800);
  }

  const handleNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      onNodesChange(changes);
      setNodes((ns) => {
        scheduleSave(ns, edges);
        setHistory({nodes: ns, edges});
        return ns;
      });
    },
    [edges],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<FlowEdge>[]) => {
      onEdgesChange(changes);
    },
    [],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge({...connection, markerEnd: {type: MarkerType.ArrowClosed}}, eds);
        scheduleSave(nodes, next);
        return next;
      });
    },
    [nodes],
  );

  function handleAutoLayout() {
    const diagramNodes = nodes.map((n) => ({id: n.id, position: n.position, data: {label: n.data.label}, type: n.type})) as DiagramNode[];
    const diagramEdges = edges.map((e) => ({id: e.id, source: e.source, target: e.target, label: e.label as string | undefined})) as DiagramEdge[];
    const laid = autoLayout(diagramNodes, diagramEdges);
    const flowLaid = laid as FlowNode[];
    setNodes(flowLaid);
    scheduleSave(flowLaid, edges);
    setHistory({nodes: flowLaid, edges});
  }

  function saveTitle() {
    setEditingTitle(false);
    if (!diagram || !title.trim()) return;
    const updated = {...diagram, title: title.trim(), updatedAt: new Date().toISOString()};
    setDiagram(updated);
    upsertUserDiagram(updated);
  }

  if (!diagram) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-[var(--color-card)] shrink-0">
        <button
          onClick={() => navigate('/diagrams')}
          className="p-1.5 rounded text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors"
        >
          <ArrowLeft size={15} />
        </button>

        {editingTitle ? (
          <input
            autoFocus
            className="text-sm font-semibold bg-[var(--color-muted)] rounded px-2 py-1 outline-none ring-1 ring-[var(--color-ring)] text-[var(--color-foreground)]"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
          />
        ) : (
          <button
            className="text-sm font-semibold text-[var(--color-foreground)] hover:text-[var(--color-muted-foreground)] transition-colors"
            onClick={() => setEditingTitle(true)}
          >
            {title}
          </button>
        )}

        <div className="flex-1" />

        <button
          onClick={() => { undo(); }}
          className="p-1.5 rounded text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors"
          title="Undo"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={() => { redo(); }}
          className="p-1.5 rounded text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors"
          title="Redo"
        >
          <Redo2 size={14} />
        </button>
        <button
          onClick={handleAutoLayout}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors"
          title="Auto layout"
        >
          <LayoutDashboard size={13} />
          Layout
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          fitView
          proOptions={{hideAttribution: true}}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

// ── Router ──

export function DiagramsPage() {
  return (
    <Routes>
      <Route index element={<DiagramList />} />
      <Route path=":id" element={<DiagramEditor />} />
    </Routes>
  );
}
