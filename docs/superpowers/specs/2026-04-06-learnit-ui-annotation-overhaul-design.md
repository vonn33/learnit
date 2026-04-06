# LearnIt UI & Annotation Overhaul — Design Spec
**Date:** 2026-04-06

## Overview

Four areas of work: content rendering fixes, a Notion-style bubble toolbar for annotation, visual annotation rendering in the reader, and layout/navigation improvements. All changes are additive or replacements within the existing React + Zustand + MDX stack.

---

## Section 1 — Content Fix: MDX Frontmatter

**Problem:** MDX files contain YAML frontmatter (`---` blocks). The current `@mdx-js/rollup` pipeline in `vite.config.ts` does not include `remark-frontmatter`, so the YAML is passed through as paragraph text and rendered visibly in the document.

**Fix:** Add `remark-frontmatter` to the `remarkPlugins` array in `vite.config.ts`.

```ts
// vite.config.ts
import remarkFrontmatter from 'remark-frontmatter';

mdx({ remarkPlugins: [remarkGfm, remarkFrontmatter], providerImportSource: '@mdx-js/react' })
```

No other changes needed. Frontmatter will be stripped at compile time.

---

## Section 2 — Bubble Toolbar (replaces HighlightPopover)

### Goal

Replace the current `HighlightPopover` (triggered by `mouseup`, tall card layout) with a compact, Notion-style `BubbleToolbar` component that appears centered above any text selection within `article.prose`.

### Trigger

- Listen to `selectionchange` on `document`, debounced 80ms.
- On each trigger: call `window.getSelection()`. If collapsed or empty, hide the bar.
- Containment check: `anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode as Element` → `.closest('article.prose')`. If null, hide.
- Position using `range.getBoundingClientRect()` passed through the existing `clampToViewport` utility.

This avoids all `mouseup` timing issues and the `commonAncestorContainer` text-node ambiguity.

### Visual Layout

A horizontal pill bar, centered above the selection:

```
[ ● Tag ▾ ]  [ Highlight ]  [ 📝 Note ]  [ ⚡ Capture ]  [ ⊕ Node ]
```

- Fixed width enough to fit all actions comfortably; clamps to viewport edges.
- Appears with a short fade-in (100ms). Dismisses on click-outside or Escape.
- The `●` dot in the Tag button previews the current tag color (amber default).

### Actions

**Tag ▾**
- Toggles a small dropdown below the toolbar showing all user tags as color chips.
- Selecting a tag updates the preview dot color. Tag selection persists for the session (stored in component state, reset on bar close).
- Multiple tags not supported in the bar; selecting a new tag replaces the previous.

**Highlight** (primary action, also triggered by `Enter`)
- Calls `createHighlight` with `pageUrl`, `selectedText`, `tagIds`, empty `note`, and `anchorContext`.
- Calls `applyHighlightsToDOM` to inject the `<mark>` immediately.
- Clears selection, closes bar.

**Note**
- Expands the bar downward: a single-line `<input>` appears below the action row.
- `Enter` within the input saves highlight + note together (calls `createHighlight` with `note` value).
- `Escape` collapses back to the action row without saving.

**Capture**
- Calls `addAnnotation` (type: `quick-capture`) + `addNode` (status: `staged`) — same logic as current `handleQuickCapture`.
- Closes bar.

**Node**
- Calls `addAnnotation` (type: `highlight`) + `addNode` (status: `placed`) — same as current `handleAddAsNode`.
- Closes bar.

**Connect-to-node** is removed from the bar and deferred to a future iteration. The `NodePicker` component currently lives inside `HighlightPopover`; moving it to `NotePanel` is out of scope here. For now, existing highlight→node connections are unaffected (they were created before this change); new connections via the reader are not supported until a follow-up.

### File changes

- `src/components/reader/HighlightPopover.tsx` — **deleted**
- `src/components/reader/BubbleToolbar.tsx` — **new**
- `src/components/reader/AnnotationLayer.tsx` — update import from `HighlightPopover` → `BubbleToolbar`

---

## Section 3 — Visual Annotation Rendering

### Highlights

`applyOneHighlight` in `src/lib/highlights.ts` already injects `<mark class="handbook-highlight">` with inline `background` and `borderBottom`. The mark may be visually suppressed by Tailwind's prose plugin resetting `<mark>` styles.

**Fix:** Add a base rule in `src/index.css`:

```css
mark.handbook-highlight {
  cursor: pointer;
  border-radius: 2px;
  padding: 0 1px;
}
```

The inline `style.background` and `style.backgroundColor` set by `applyOneHighlight` take precedence over this rule, so tag colors render correctly.

### Note Indicators

When a highlight has a non-empty `note` field, a small visual indicator appears inline after the highlighted text.

**Implementation in `applyOneHighlight`:**
- After injecting the `<mark>`, if `hl.note` is truthy, create a `<span class="handbook-note-dot" data-highlight-id="hl.id">` and insert it immediately after the mark.
- Style: a small filled circle (6×6px, `border-radius: 50%`, `display: inline-block`, `vertical-align: super`, `margin-left: 1px`) colored with the highlight's tag color or amber default.
- Add rule to `index.css`: `span.handbook-note-dot { cursor: pointer; }`.

**Click handling in `AnnotationLayer`:**
- Extend the existing document click handler to also match `span.handbook-note-dot[data-highlight-id]`.
- On match: set `activeNoteId` and `markRect` from the span's `getBoundingClientRect()`.
- Render `NoteTooltip` when `activeNoteId` is set.

**`NoteTooltip` component** (`src/components/reader/NoteTooltip.tsx` — new):
- Small floating card, positioned via `clampToViewport` from the dot's rect.
- Shows: note text (read-only), an "Edit" button.
- "Edit" closes the tooltip and opens the existing `NotePanel` for that highlight ID.
- Dismissed on click-outside or Escape.

---

## Section 4 — Layout & Navigation

### Panel Flip

In `DocsPage.tsx`, swap the `left` and `right` props passed to `WorkspaceLayout`:
- `left` → reader (`#docs-content` + `AnnotationLayer`)
- `right` → map (`MapCanvas` + `StagingInbox`)

Update `WorkspaceLayout` toolbar button labels/`aria-label` attributes:
- Left button: "Focus reader" (was "Focus map")
- Right button: "Focus map" (was "Focus reader")

### Layout Persistence

**New store:** `src/store/workspaceStore.ts`

```ts
interface WorkspaceState {
  mode: 'split' | 'focus-left' | 'focus-right';
  splitPercent: number;
  sidebarCollapsed: boolean;
}
```

Uses Zustand `persist` middleware writing to `localStorage` key `learnit-workspace`. `WorkspaceLayout` reads `mode` and `splitPercent` from the store instead of `useState`. `Sidebar` reads `sidebarCollapsed` from the store.

Survives route changes (store is module-level singleton) and page reloads (localStorage persistence).

### Collapsible Sidebar

**`Sidebar` component changes:**
- Read `sidebarCollapsed` and `setSidebarCollapsed` from `useWorkspaceStore`.
- When `sidebarCollapsed` is true: sidebar width is `48px`, content hidden, only a slim border rail visible.
- A `ChevronLeft`/`ChevronRight` toggle button is pinned to the bottom of the sidebar (`position: sticky; bottom: 0`). Clicking it calls `setSidebarCollapsed`.
- `Shell.tsx`: pass the sidebar width dynamically — when collapsed, the desktop sidebar renders at 48px, not `w-64`.
- Mobile drawer behavior (`drawerOpen` state in `Shell`) is unchanged.

### Bottom Navigation

**New component:** `src/components/reader/DocNav.tsx`

**Logic:**
1. Flatten the manifest into an ordered array of `{ categoryKey, sectionKey, slug, label }` entries, iterating `Object.entries(manifest)` → sections → docs in manifest order.
2. Find the index of the current slug from `useLocation().pathname`.
3. Return the entry at `index - 1` (prev) and `index + 1` (next), or `null` at boundaries.

**Rendering:**
- Two links: `← Prev title` (left-aligned) and `Next title →` (right-aligned), in a `flex justify-between` row.
- Uses React Router `Link`.
- Rendered inside the reader scroll area in `DocsPage`, below `</article>` and above `<AnnotationLayer>`.
- Labels use the doc slug formatted as title case (same as sidebar: `slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())`).

---

## Files Affected

| File | Change |
|------|--------|
| `vite.config.ts` | Add `remark-frontmatter` plugin |
| `src/index.css` | Add `mark.handbook-highlight` and `span.handbook-note-dot` rules |
| `src/lib/highlights.ts` | Add note indicator span injection in `applyOneHighlight` |
| `src/store/workspaceStore.ts` | **New** — Zustand persist store for layout state |
| `src/components/reader/HighlightPopover.tsx` | **Deleted** |
| `src/components/reader/BubbleToolbar.tsx` | **New** — replaces HighlightPopover |
| `src/components/reader/NoteTooltip.tsx` | **New** — floating note read view |
| `src/components/reader/AnnotationLayer.tsx` | Update imports; extend click handler for note dots |
| `src/components/reader/DocNav.tsx` | **New** — prev/next navigation |
| `src/components/workspace/WorkspaceLayout.tsx` | Read from workspaceStore; update button labels |
| `src/components/layout/Sidebar.tsx` | Read collapsed state from workspaceStore; add toggle button |
| `src/components/layout/Shell.tsx` | Pass collapsed-aware width to desktop sidebar |
| `src/pages/DocsPage.tsx` | Swap left/right panels; add DocNav to reader |
