# Wave A — Reader & Nav Wires Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire three deferred reader features: connect-to-node from NotePanel, super-node drill-in navigation, and Tag & Highlight combined action in BubbleToolbar.

**Architecture:** All changes are additive modifications to existing components. No new stores or schema changes. `NodePicker` (already exists, orphaned) gets mounted inside `NotePanel`. `MapCanvas` gains an `onNodeDoubleClick` prop wired through to `DocsPage`. `BubbleToolbar` gains a conditional button and the existing Enter handler already covers Shift+Enter.

**Tech Stack:** React, Zustand (annotationStore + mapStore), @xyflow/react, React Router, Vitest + Testing Library

---

## File Map

| File | Change |
|------|--------|
| `src/components/reader/BubbleToolbar.tsx` | Add conditional Tag & Highlight button |
| `src/components/reader/AnnotationLayer.tsx` | Add `activeAnnotationId` state; pass to NotePanel |
| `src/components/reader/NotePanel.tsx` | Add `annotationId` + `topicId` props; connected-node section |
| `src/components/map/ConceptNode.tsx` | Add `↗` indicator for super-nodes |
| `src/components/map/MapCanvas.tsx` | Add `onNodeDoubleClick` prop |
| `src/pages/DocsPage.tsx` | Export `getFirstDocPathForTopic`; add drill-in handler; pass to MapCanvas |
| `src/__tests__/connectToNode.test.ts` | New — store-level connect/disconnect tests |
| `src/__tests__/docsPage.test.ts` | New — `getFirstDocPathForTopic` unit tests |

---

## Task 1: BubbleToolbar — Tag & Highlight Button

**Files:**
- Modify: `src/components/reader/BubbleToolbar.tsx`

The current `Enter` keydown handler fires on `e.key === 'Enter'` which already catches Shift+Enter (no handler change needed). The only addition is a conditional button that appears when a tag is selected.

- [ ] **Step 1: Add `border` to the `getHighlightColorForTags` destructure**

At line 192, change:

```ts
const {bg: previewBg} = getHighlightColorForTags(
  selectedTagId ? [selectedTagId] : [],
  tags,
);
```

to:

```ts
const {bg: previewBg, border: previewBorder} = getHighlightColorForTags(
  selectedTagId ? [selectedTagId] : [],
  tags,
);
```

- [ ] **Step 2: Add the Tag & Highlight button after Highlight, before Note**

In the main action row JSX, after the closing `</button>` of the Highlight button (around line 241) and before the Note button, insert:

```tsx
{selectedTagId && (
  <>
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        doHighlight('');
      }}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-muted)] text-xs font-medium text-[var(--color-foreground)] transition-colors"
      title="Tag & Highlight (Shift+Enter)"
    >
      <span
        className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
        style={{background: previewBorder}}
      />
      Tag &amp; Highlight
    </button>
  </>
)}
```

- [ ] **Step 3: Run tests to confirm nothing broken**

```bash
npx vitest run
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/reader/BubbleToolbar.tsx
git commit -m "feat: add Tag & Highlight combined button to BubbleToolbar"
```

---

## Task 2: AnnotationLayer — Pass annotationId to NotePanel

**Files:**
- Modify: `src/components/reader/AnnotationLayer.tsx`

- [ ] **Step 1: Add `activeAnnotationId` state**

After line 18 (`const [noteDotRect, ...`), add:

```ts
const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
```

- [ ] **Step 2: Set `activeAnnotationId` in the mark click branch**

In the mark click handler (the block starting with `if (mark?.dataset.highlightId)`), `annotationId` is already extracted from `mark.dataset.annotationId`. After the line `setActiveNoteId(null);`, add:

```ts
setActiveAnnotationId(annotationId ?? null);
```

So the full mark click branch becomes:

```ts
const mark = (e.target as HTMLElement).closest(
  'mark[data-highlight-id]',
) as HTMLElement | null;
if (mark?.dataset.highlightId) {
  const id = mark.dataset.highlightId;
  setMarkRect(mark.getBoundingClientRect());
  setActiveHighlightId(id);
  setActiveNoteId(null);
  setActiveAnnotationId(mark.dataset.annotationId ?? null);

  const annotationId = mark.dataset.annotationId;
  if (annotationId) {
    const annotation = useAnnotationStore
      .getState()
      .annotations.find((a) => a.id === annotationId);
    if (annotation?.mapNodeId) {
      window.dispatchEvent(
        new CustomEvent('focus-map-node', {detail: {nodeId: annotation.mapNodeId}}),
      );
    }
  }
}
```

- [ ] **Step 3: Clear `activeAnnotationId` when NotePanel closes**

In the `onClose` handler passed to `NotePanel`, change:

```tsx
onClose={() => setActiveHighlightId(null)}
```

to:

```tsx
onClose={() => {
  setActiveHighlightId(null);
  setActiveAnnotationId(null);
}}
```

- [ ] **Step 4: Pass `annotationId` and `topicId` to NotePanel**

Update the NotePanel render from:

```tsx
<NotePanel
  highlightId={activeHighlightId}
  anchorRect={markRect}
  tags={getTags()}
  onClose={() => setActiveHighlightId(null)}
  onDelete={(id) => {
```

to:

```tsx
<NotePanel
  highlightId={activeHighlightId}
  annotationId={activeAnnotationId ?? undefined}
  topicId={topicId}
  anchorRect={markRect}
  tags={getTags()}
  onClose={() => {
    setActiveHighlightId(null);
    setActiveAnnotationId(null);
  }}
  onDelete={(id) => {
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run
```

Expected: all existing tests pass (NotePanel doesn't yet use the new props, so no visible change).

- [ ] **Step 6: Commit**

```bash
git add src/components/reader/AnnotationLayer.tsx
git commit -m "feat: pass annotationId from AnnotationLayer to NotePanel"
```

---

## Task 3: NotePanel — Connected-Node Section

**Files:**
- Modify: `src/components/reader/NotePanel.tsx`
- Create: `src/__tests__/connectToNode.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/connectToNode.test.ts`:

```ts
import {describe, it, expect, beforeEach} from 'vitest';
import {useAnnotationStore} from '@/store/annotationStore';
import {useMapStore} from '@/store/mapStore';

beforeEach(() => {
  useAnnotationStore.getState().reset();
  useMapStore.getState().reset();
});

describe('connect-to-node store interactions', () => {
  it('links annotation to map node (both stores updated)', () => {
    const annotationId = useAnnotationStore.getState().addAnnotation({
      docId: 'doc-1',
      position: {start: 0, end: 10},
      type: 'highlight',
      text: 'test selection',
    });
    useMapStore.getState().initMap('topic-1');
    const nodeId = useMapStore.getState().addNode('topic-1', {
      label: 'Test Node',
      type: 'concept',
      status: 'placed',
      position: {x: 100, y: 100},
    });

    // Simulate NotePanel handleConnect
    useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId});
    useMapStore.getState().updateNode('topic-1', nodeId, {annotationId});

    const annotation = useAnnotationStore.getState().annotations[0];
    const node = useMapStore.getState().maps['topic-1'].nodes[0];
    expect(annotation.mapNodeId).toBe(nodeId);
    expect(node.annotationId).toBe(annotationId);
  });

  it('disconnects annotation from map node (both stores cleared)', () => {
    const annotationId = useAnnotationStore.getState().addAnnotation({
      docId: 'doc-1',
      position: {start: 0, end: 10},
      type: 'highlight',
      text: 'test',
    });
    useMapStore.getState().initMap('topic-1');
    const nodeId = useMapStore.getState().addNode('topic-1', {
      label: 'Node',
      type: 'concept',
      status: 'placed',
      position: {x: 0, y: 0},
    });
    useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId});
    useMapStore.getState().updateNode('topic-1', nodeId, {annotationId});

    // Simulate NotePanel handleDisconnect
    useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: undefined});
    useMapStore.getState().updateNode('topic-1', nodeId, {annotationId: undefined});

    const annotation = useAnnotationStore.getState().annotations[0];
    const node = useMapStore.getState().maps['topic-1'].nodes[0];
    expect(annotation.mapNodeId).toBeUndefined();
    expect(node.annotationId).toBeUndefined();
  });

  it('can reconnect to a different node', () => {
    const annotationId = useAnnotationStore.getState().addAnnotation({
      docId: 'doc-1',
      position: {start: 0, end: 10},
      type: 'highlight',
      text: 'test',
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

    useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId1});
    useMapStore.getState().updateNode('topic-1', nodeId1, {annotationId});

    // Reconnect to node 2
    useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId2});
    useMapStore.getState().updateNode('topic-1', nodeId1, {annotationId: undefined});
    useMapStore.getState().updateNode('topic-1', nodeId2, {annotationId});

    expect(useAnnotationStore.getState().annotations[0].mapNodeId).toBe(nodeId2);
    expect(useMapStore.getState().maps['topic-1'].nodes.find((n) => n.id === nodeId1)?.annotationId).toBeUndefined();
    expect(useMapStore.getState().maps['topic-1'].nodes.find((n) => n.id === nodeId2)?.annotationId).toBe(annotationId);
  });
});
```

- [ ] **Step 2: Run tests to confirm they pass (they test store behavior that already works)**

```bash
npx vitest run src/__tests__/connectToNode.test.ts
```

Expected: PASS — these tests only use existing store methods.

- [ ] **Step 3: Add imports and new props to NotePanel**

At the top of `src/components/reader/NotePanel.tsx`, add imports after the existing ones:

```ts
import {useAnnotationStore} from '@/store/annotationStore';
import {useMapStore} from '@/store/mapStore';
import {NodePicker} from '@/components/map/NodePicker';
```

Update `NotePanelProps`:

```ts
interface NotePanelProps {
  highlightId: string;
  annotationId?: string;
  topicId?: string;
  anchorRect: DOMRect | null;
  tags: Tag[];
  onClose: () => void;
  onDelete: (id: string) => void;
}
```

Update the function signature:

```ts
export function NotePanel({highlightId, annotationId, topicId, anchorRect: _anchorRect, tags, onClose, onDelete}: NotePanelProps) {
```

- [ ] **Step 4: Add connected-node state inside NotePanel**

After the existing `const deleteTimerRef = ...` line, add:

```ts
const [showNodePicker, setShowNodePicker] = useState(false);
const [mapNodeId, setMapNodeId] = useState<string | null>(() =>
  annotationId
    ? (useAnnotationStore.getState().annotations.find((a) => a.id === annotationId)?.mapNodeId ?? null)
    : null,
);
```

- [ ] **Step 5: Add connect/disconnect handlers inside NotePanel**

After the existing `save()` function, add:

```ts
function handleConnect(nodeId: string) {
  if (!annotationId || !topicId) return;
  useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId});
  useMapStore.getState().updateNode(topicId, nodeId, {annotationId});
  setMapNodeId(nodeId);
  setShowNodePicker(false);
}

function handleDisconnect() {
  if (!annotationId || !topicId || !mapNodeId) return;
  useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: undefined});
  useMapStore.getState().updateNode(topicId, mapNodeId, {annotationId: undefined});
  setMapNodeId(null);
}
```

- [ ] **Step 6: Derive `connectedNodeLabel` at render time**

After the existing `const appliedTags = ...` line (just before the `return`), add:

```ts
const connectedNodeLabel =
  mapNodeId && topicId
    ? (useMapStore.getState().maps[topicId]?.nodes.find((n) => n.id === mapNodeId)?.label ?? null)
    : null;
```

- [ ] **Step 7: Add the connected-node section to the JSX**

Insert this block between the Note `</div>` and the Link `<div>` (between the note textarea section and the "Link to" section):

```tsx
{/* Map Node Connection */}
{annotationId && topicId && (
  <div className="px-4 pb-3">
    <label className="block text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)] font-semibold mb-1.5">
      Map Node
    </label>
    {mapNodeId && connectedNodeLabel ? (
      <div className="flex items-center gap-2">
        <span className="flex-1 text-xs text-[var(--color-foreground)] bg-[var(--color-muted)] rounded px-3 py-2 truncate">
          {connectedNodeLabel}
        </span>
        <button
          onClick={handleDisconnect}
          className="text-[var(--color-muted-foreground)] hover:text-destructive transition-colors shrink-0"
          aria-label="Disconnect node"
        >
          <X size={14} />
        </button>
      </div>
    ) : showNodePicker ? (
      <NodePicker
        topicId={topicId}
        onSelect={handleConnect}
        onClose={() => setShowNodePicker(false)}
      />
    ) : (
      <button
        onClick={() => setShowNodePicker(true)}
        className="w-full text-left text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] bg-[var(--color-muted)] rounded px-3 py-2 transition-colors"
      >
        Connect to map node →
      </button>
    )}
  </div>
)}
```

- [ ] **Step 8: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/components/reader/NotePanel.tsx src/__tests__/connectToNode.test.ts
git commit -m "feat: add connect-to-node section in NotePanel"
```

---

## Task 4: ConceptNode — Super-Node Drill-In Indicator

**Files:**
- Modify: `src/components/map/ConceptNode.tsx`

- [ ] **Step 1: Add `position: relative` and `↗` indicator to super-node JSX**

Replace the entire component with:

```tsx
import { Handle, Position, type NodeProps } from '@xyflow/react';

interface ConceptNodeData {
  label: string;
  nodeType: 'structural' | 'concept' | 'super-node';
  hasAnnotation?: boolean;
}

export function ConceptNode({ data }: NodeProps) {
  const d = data as unknown as ConceptNodeData;
  const isStructural = d.nodeType === 'structural';
  const isSuperNode = d.nodeType === 'super-node';

  return (
    <div
      className={`
        relative px-3 py-2 rounded-lg border text-sm max-w-[200px] truncate
        ${isStructural ? 'bg-muted/50 border-border text-foreground/60' : ''}
        ${isSuperNode ? 'bg-card border-primary/40 text-foreground border-dashed' : ''}
        ${!isStructural && !isSuperNode ? 'bg-card border-primary/20 text-foreground shadow-sm' : ''}
        ${d.hasAnnotation ? 'ring-1 ring-primary/30' : ''}
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary/40 !w-2 !h-2" />
      {isSuperNode && (
        <span className="absolute top-0.5 right-1 text-[10px] text-primary/50 leading-none pointer-events-none">
          ↗
        </span>
      )}
      <span>{d.label}</span>
      <Handle type="source" position={Position.Bottom} className="!bg-primary/40 !w-2 !h-2" />
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/map/ConceptNode.tsx
git commit -m "feat: add drill-in indicator to super-node"
```

---

## Task 5: MapCanvas + DocsPage — Super-Node Drill-In Navigation

**Files:**
- Modify: `src/components/map/MapCanvas.tsx`
- Modify: `src/pages/DocsPage.tsx`
- Create: `src/__tests__/docsPage.test.ts`

- [ ] **Step 1: Write failing tests for `getFirstDocPathForTopic`**

Create `src/__tests__/docsPage.test.ts`:

```ts
import {describe, it, expect, vi} from 'vitest';
import {getFirstDocPathForTopic} from '@/pages/DocsPage';

// vi.mock is hoisted by Vitest before imports resolve — same pattern as docNav.test.tsx
vi.mock('@/data/content-manifest.json', () => ({
  default: {
    'language-learning': {
      sections: {
        handbook: {docs: ['part-1a-fluent-forever', 'part-1b-vocab']},
        advanced: {docs: ['immersion']},
      },
    },
    'productivity': {
      sections: {
        'getting-started': {docs: ['intro']},
      },
    },
    'empty-topic': {
      sections: {
        'no-docs': {docs: []},
      },
    },
  },
}));

describe('getFirstDocPathForTopic', () => {
  it('returns path for first doc in first section of a known topic', async () => {
    expect(getFirstDocPathForTopic('language-learning')).toBe(
      '/docs/language-learning/handbook/part-1a-fluent-forever',
    );
  });

  it('returns path for another known topic', () => {
    expect(getFirstDocPathForTopic('productivity')).toBe(
      '/docs/productivity/getting-started/intro',
    );
  });

  it('returns null for unknown topic', () => {
    expect(getFirstDocPathForTopic('nonexistent')).toBeNull();
  });

  it('returns null for topic with no docs in any section', () => {
    expect(getFirstDocPathForTopic('empty-topic')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails (function not yet exported)**

```bash
npx vitest run src/__tests__/docsPage.test.ts
```

Expected: FAIL — `getFirstDocPathForTopic` is not exported.

- [ ] **Step 3: Extract and export `getFirstDocPathForTopic` in DocsPage.tsx**

In `src/pages/DocsPage.tsx`, replace the existing `getFirstDocPath` function (lines 48-61):

```ts
function getFirstDocPath(): string {
  const typedManifest = manifest as Record<
    string,
    {sections: Record<string, {docs: string[]}>}
  >;
  for (const [cat, catData] of Object.entries(typedManifest)) {
    for (const [sec, secData] of Object.entries(catData.sections)) {
      if (secData.docs[0]) {
        return `/docs/${cat}/${sec}/${secData.docs[0]}`;
      }
    }
  }
  return '/docs';
}
```

with:

```ts
export function getFirstDocPathForTopic(topicId: string): string | null {
  const typedManifest = manifest as Record<
    string,
    {sections: Record<string, {docs: string[]}>}
  >;
  const catData = typedManifest[topicId];
  if (!catData) return null;
  for (const [sec, secData] of Object.entries(catData.sections)) {
    if (secData.docs[0]) return `/docs/${topicId}/${sec}/${secData.docs[0]}`;
  }
  return null;
}

function getFirstDocPath(): string {
  const typedManifest = manifest as Record<
    string,
    {sections: Record<string, {docs: string[]}>}
  >;
  for (const [cat] of Object.entries(typedManifest)) {
    const path = getFirstDocPathForTopic(cat);
    if (path) return path;
  }
  return '/docs';
}
```

- [ ] **Step 4: Run tests to confirm `getFirstDocPathForTopic` tests pass**

```bash
npx vitest run src/__tests__/docsPage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add `onNodeDoubleClick` prop to MapCanvas**

In `src/components/map/MapCanvas.tsx`, update the interface:

```ts
interface MapCanvasProps {
  topicId: string;
  onNodeClick?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
}
```

Add the handler after `handleNodeClick`:

```ts
const handleNodeDoubleClick = useCallback(
  (_: unknown, node: Node) => {
    onNodeDoubleClick?.(node.id);
  },
  [onNodeDoubleClick],
);
```

Add to `<ReactFlow>` props (after `onNodeClick={handleNodeClick}`):

```tsx
onNodeDoubleClick={handleNodeDoubleClick}
```

- [ ] **Step 6: Add `useNavigate` and drill-in handler to DocsPage**

In `src/pages/DocsPage.tsx`, update the react-router import:

```ts
import {useLocation, Navigate, useNavigate} from 'react-router';
```

Inside `DocsPage`, add `useNavigate` after the existing hooks (before `handleMapNodeClick`):

```ts
const navigate = useNavigate();
```

Add `handleMapNodeDoubleClick` after `handleMapNodeClick`:

```ts
const handleMapNodeDoubleClick = useCallback(
  (nodeId: string) => {
    const topicMap = useMapStore.getState().maps[topicId];
    if (!topicMap) return;
    const node = topicMap.nodes.find((n) => n.id === nodeId);
    if (!node?.linkedMapId) return;
    const path = getFirstDocPathForTopic(node.linkedMapId);
    if (path) navigate(path);
  },
  [topicId, navigate],
);
```

- [ ] **Step 7: Pass `onNodeDoubleClick` to MapCanvas in DocsPage JSX**

Change:

```tsx
<MapCanvas topicId={topicId} onNodeClick={handleMapNodeClick} />
```

to:

```tsx
<MapCanvas topicId={topicId} onNodeClick={handleMapNodeClick} onNodeDoubleClick={handleMapNodeDoubleClick} />
```

- [ ] **Step 8: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/components/map/MapCanvas.tsx src/pages/DocsPage.tsx src/__tests__/docsPage.test.ts
git commit -m "feat: super-node drill-in navigation on double-click"
```

---

## Final check

```bash
npx vitest run
```

Expected: all tests pass (prior suite + 3 new connect-to-node + 4 new docsPage tests).
