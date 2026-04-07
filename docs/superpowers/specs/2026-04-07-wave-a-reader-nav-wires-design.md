# Wave A — Reader & Nav Wires Design Spec
**Date:** 2026-04-07

## Overview

Three additive features that complete deferred work from the UI Annotation Overhaul. All changes are confined to existing components; no new stores or data model changes required.

---

## Section 1 — Connect-to-Node in NotePanel

### Goal

Wire the existing `NodePicker` component into `NotePanel` so users can link a highlight to a map node directly from the note editor.

### Data flow

- `Annotation.mapNodeId` (annotationStore) — stores the linked node ID
- `MapNode.annotationId` (mapStore) — back-reference on the node side
- `mark[data-annotation-id]` — DOM attribute already set by `applyOneHighlight`, already read by `AnnotationLayer`'s click handler

### NotePanel changes

Add two optional props:

```ts
annotationId?: string;
topicId?: string;
```

Add a "Connected node" section between the note textarea and the "Link to" field:

- Hidden when `annotationId` or `topicId` is absent
- **Connected state** (`annotation.mapNodeId` is set): shows the node label in a small chip + an "×" disconnect button
  - Disconnect: `updateAnnotation(annotationId, {mapNodeId: undefined})` + `updateNode(topicId, nodeId, {annotationId: undefined})`
- **Unconnected state**: shows a "Connect to map node →" button
  - Clicking renders `NodePicker` inline (replacing the button, not floating)
  - On node select: `updateAnnotation(annotationId, {mapNodeId: nodeId})` + `updateNode(topicId, nodeId, {annotationId})`
  - `NodePicker` `onClose` collapses back to the button

Node label display: read from `useMapStore.getState().maps[topicId]?.nodes.find(n => n.id === mapNodeId)?.label`. Read at render time, no subscription needed.

### AnnotationLayer changes

The click handler already reads `mark.dataset.annotationId`. Pass it through to `NotePanel`:

```tsx
<NotePanel
  highlightId={activeHighlightId}
  annotationId={activeAnnotationId}   // new
  topicId={topicId}                   // already available as prop
  anchorRect={markRect}
  tags={getTags()}
  onClose={...}
  onDelete={...}
/>
```

Add `activeAnnotationId: string | null` state to `AnnotationLayer`, set in the mark click branch alongside `activeHighlightId`.

### Files

| File | Change |
|------|--------|
| `src/components/reader/NotePanel.tsx` | Add `annotationId`, `topicId` props; add connected-node section |
| `src/components/reader/AnnotationLayer.tsx` | Add `activeAnnotationId` state; pass to NotePanel |

---

## Section 2 — Super-Node Drill-In

### Goal

Double-clicking a super-node on the map canvas navigates to the first doc of the linked topic.

### MapCanvas changes

Add optional prop:

```ts
onNodeDoubleClick?: (nodeId: string) => void;
```

Wire to ReactFlow's `onNodeDoubleClick` callback:

```tsx
const handleNodeDoubleClick = useCallback(
  (_: unknown, node: Node) => {
    onNodeDoubleClick?.(node.id);
  },
  [onNodeDoubleClick],
);
```

Pass to `<ReactFlow onNodeDoubleClick={handleNodeDoubleClick} />`.

### DocsPage handler

```ts
const handleMapNodeDoubleClick = useCallback((nodeId: string) => {
  const topicMap = useMapStore.getState().maps[topicId];
  if (!topicMap) return;
  const node = topicMap.nodes.find((n) => n.id === nodeId);
  if (!node?.linkedMapId) return;
  const path = getFirstDocPathForTopic(node.linkedMapId);
  if (path) navigate(path);
}, [topicId, navigate]);
```

Extract a `getFirstDocPathForTopic(topicId: string): string | null` helper from the existing `getFirstDocPath()` function in `DocsPage.tsx`. `getFirstDocPath()` becomes a call to `getFirstDocPathForTopic` with the first available topic.

### ConceptNode visual hint

Add a `↗` indicator in the top-right corner of super-nodes so users know they're drillable:

```tsx
{isSuperNode && (
  <span className="absolute top-0.5 right-1 text-[10px] text-primary/50 leading-none">↗</span>
)}
```

The node wrapper needs `position: relative` (`className="relative ..."`) to anchor the absolute span.

### Files

| File | Change |
|------|--------|
| `src/components/map/MapCanvas.tsx` | Add `onNodeDoubleClick` prop; wire to ReactFlow |
| `src/components/map/ConceptNode.tsx` | Add `↗` indicator for super-nodes |
| `src/pages/DocsPage.tsx` | Add `handleMapNodeDoubleClick`; extract `getFirstDocPathForTopic`; pass handler to MapCanvas |

---

## Section 3 — Tag & Highlight Combined Action

### Goal

Allow one-click (or `Shift+Enter`) highlight+tag in BubbleToolbar when a tag is already selected, reducing a two-step flow to one.

### BubbleToolbar changes

**Conditional button:** Rendered immediately after the Tag dropdown button, only when `selectedTagIds.length > 0`:

```tsx
{selectedTagIds.length > 0 && (
  <button
    onMouseDown={(e) => { e.preventDefault(); doHighlight(''); }}
    className="..."
    title="Tag & Highlight (Shift+Enter)"
  >
    <span style={{color: currentTagColor}}>●</span> Tag & Highlight
  </button>
)}
```

`currentTagColor`: the color of the first selected tag (same dot-preview logic already used for the Tag button). The button uses `onMouseDown` + `e.preventDefault()` consistent with all other toolbar buttons.

**Keyboard shortcut:** In the existing `keydown` handler on the toolbar div, extend the `Enter` branch:

```ts
if (e.key === 'Enter' && !e.shiftKey && !noteExpanded) { doHighlight(''); }
if (e.key === 'Enter' && e.shiftKey) { doHighlight(''); }  // Shift+Enter always highlights
```

`Shift+Enter` always calls `doHighlight('')` regardless of tag selection (same outcome — if no tags are selected, it highlights without tags, identical to plain `Enter`). The shortcut is additive: it doesn't change existing `Enter` behavior.

### Files

| File | Change |
|------|--------|
| `src/components/reader/BubbleToolbar.tsx` | Add conditional Tag & Highlight button; add Shift+Enter handler |

---

## Files Affected Summary

| File | Change |
|------|--------|
| `src/components/reader/NotePanel.tsx` | Add `annotationId`, `topicId` props; add connected-node section with NodePicker |
| `src/components/reader/AnnotationLayer.tsx` | Add `activeAnnotationId` state; pass to NotePanel |
| `src/components/map/MapCanvas.tsx` | Add `onNodeDoubleClick` prop |
| `src/components/map/ConceptNode.tsx` | Add `↗` indicator for super-nodes |
| `src/pages/DocsPage.tsx` | Add double-click handler; extract `getFirstDocPathForTopic` |
| `src/components/reader/BubbleToolbar.tsx` | Add Tag & Highlight button + Shift+Enter shortcut |
