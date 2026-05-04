# Mobile Annotation UX — Design Spec

**Date:** 2026-05-04
**Status:** Approved, ready for implementation plan
**Branch target:** new feature branch off `main`

---

## Goal

Make text annotation usable on touch devices (phones, tablets) without breaking the existing desktop `BubbleToolbar` flow. Mobile is a long-term primary use case for LearnIt; current annotation UX is mouse-only and unusable on touch.

## Scope (in this wave)

- Highlight + apply existing tag + optional note — all from a bottom sheet on touch devices
- New `useTextSelection` hook extracted from `BubbleToolbar`
- New `MobileAnnotationSheet` component
- `AnnotationLayer` chooses which surface to render based on pointer type
- Behaviour-preserving refactor of `BubbleToolbar` to consume the new hook

## Out of scope (deferred to other waves)

- Tag system redesign (creation flow, picker UX, structure) — pinned, separate wave
- PWA / standalone mode — pinned, separate wave
- Map node actions on mobile (Quick capture, Add as node, Connect) — desktop-only for v1
- Touch interactions on `MapCanvas` — still mouse-only
- iPad-specific native menu workarounds beyond what falls out of the bottom-sheet pattern
- Multi-tag selection (matching desktop: one tag per highlight)

## Constraints

- Tech stack fixed: React 19, Tailwind v4, Zustand, Supabase, Lucide icons
- Existing 106 unit tests must continue passing
- Desktop `BubbleToolbar` rendered output must be unchanged after refactor
- iOS Safari native selection menu cannot be suppressed — design must accept coexistence
- No new runtime dependencies (no Radix Drawer, no Vaul, no spring libs)

---

## Architecture

Two new files; two existing files touched:

```
src/lib/useTextSelection.ts                         (new)
src/components/reader/MobileAnnotationSheet.tsx     (new)
src/components/reader/AnnotationLayer.tsx           (render-branch + Android contextmenu effect)
src/components/reader/BubbleToolbar.tsx             (refactor to consume hook)
```

`AnnotationLayer` evaluates pointer type once at module load:

```ts
const isCoarsePointer = typeof window !== 'undefined'
  && window.matchMedia('(pointer: coarse)').matches;
```

Module scope, captured once when the module first loads. Not reactive — switching pointer mid-session is rare and not supported. Renders one of the two surfaces:

```tsx
{isCoarsePointer
  ? <MobileAnnotationSheet pageUrl={pageUrl} topicId={topicId} />
  : <BubbleToolbar pageUrl={pageUrl} topicId={topicId} />}
```

Both components share the new `useTextSelection` hook for selection capture. Each owns its own UI state (note mode, tag selection, etc.).

---

## `useTextSelection` hook

`src/lib/useTextSelection.ts`

```ts
type SelectionState = {
  text: string;
  savedRange: Range;
  selectionRect: DOMRect;
} | null;

interface Options {
  containerSelector: string;        // 'article.prose'
  minLength?: number;                // default 3
  trigger: 'pointer' | 'touch';
}

export function useTextSelection(opts: Options): {
  selection: SelectionState;
  clear: () => void;
};
```

### Pointer mode

Listens to `selectionchange` on `document`, debounced 80ms. When fired:
- Reads `window.getSelection()`
- Returns `null` selection if collapsed, no ranges, text length < `minLength`, or anchor not inside `containerSelector`
- Otherwise stores `{ text, savedRange: range.cloneRange(), selectionRect: range.getBoundingClientRect() }`
- Skips processing if `document.activeElement` is inside a node with `data-highlight-popover="true"` (preserves existing behaviour where typing in note input does not retrigger selection capture)

### Touch mode

Listens to `touchend` on `document`. No `selectionchange` listener at all.
- On `touchend`, validates same way as pointer mode
- This avoids reposition flashing while user drags native selection handles
- Selection only "settles" when finger lifts — exactly when we want to surface the sheet

### `clear()`

Sets selection state to `null` and calls `window.getSelection()?.removeAllRanges()`.

### BubbleToolbar refactor

`BubbleToolbar` currently owns the selection-detection useEffect inline (lines 38–83 of current file). After refactor, it calls `useTextSelection({ containerSelector: 'article.prose', trigger: 'pointer' })` and uses `selection?.text`, `selection?.savedRange`, `selection?.selectionRect` in place of its current local state. The `setVisible(false)` calls become `clear()`. Net result: same behaviour, fewer lines.

---

## `MobileAnnotationSheet` component

`src/components/reader/MobileAnnotationSheet.tsx`

### Props

```ts
interface MobileAnnotationSheetProps {
  pageUrl: string;
  topicId?: string;
}
```

`topicId` is unused on mobile per scope (no map-node actions). Kept for API parity with `BubbleToolbar` so `AnnotationLayer` can pass the same props to either component.

### Internal state

```ts
const [noteMode, setNoteMode] = useState(false);
const [noteText, setNoteText] = useState('');
const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
```

Selection from `useTextSelection({ containerSelector: 'article.prose', trigger: 'touch' })`.

### Render gate

Returns `null` when `selection === null`. Uses `useDelayedUnmount(selection !== null, 160)` for exit animation, mirroring `BubbleToolbar`.

### Default state layout

```
┌────────────────────────────┐
│        ───── (drag)        │
│ │ "selected text excerpt"  │
│ ● Tag  ● Tag  ● Tag  → →   │  (horizontal scroll)
│                            │
│ [   Highlight    ] [✎] [✕] │
└────────────────────────────┘
```

Tailwind: fixed bottom-0 inset-x-0 z-50, rounded-t-2xl, border-t, bg-card, padding env(safe-area-inset-bottom).

Tag row uses `overflow-x-auto` with `-webkit-overflow-scrolling: touch`. Existing tags only — no inline create button (deferred to tag-redesign wave).

### Note-mode layout

When `noteMode === true`, action row replaced:

```
┌────────────────────────────┐
│        ───── (drag)        │
│ │ "selected text excerpt"  │
│ ● Tag  ● Tag  ● Tag  → →   │
│ ┌────────────────────────┐ │
│ │ Add a note…            │ │  (input)
│ └────────────────────────┘ │
│ [  Save highlight  ] [✕]   │
└────────────────────────────┘
```

Input auto-focuses on mode entry. ↵ in input → save. Esc → exit note mode without losing selection.

### Actions

| Action | Effect |
|---|---|
| Tap Highlight | `addAnnotation({ type: 'highlight', docId: pageUrl, text, anchorContext, tagIds: selectedTagId ? [selectedTagId] : [], note: '', connectionUrl: '' })` then `clear()` |
| Tap ✎ | `setNoteMode(true)` |
| Tap Save (note mode) | `addAnnotation({ ..., note: noteText })` then `clear()` |
| Tap ✕ | `clear()` without saving |
| Tap tag pill | Toggle `selectedTagId` (matches BubbleToolbar single-tag semantics) |
| Drag handle down > 60px | `clear()` |
| Tap outside sheet | `clear()` — implemented via existing `useClickOutside` hook from `src/lib/useClickOutside.ts` (`deferArm: true` to avoid the same touch that opened the sheet dismissing it) |

`anchorContext` built via existing `buildAnchorContext(savedRange)` from `src/lib/highlights.ts`.

### Native menu coexistence

iOS Safari native selection menu cannot be suppressed. Accept coexistence:
- Native menu in system zone (above selection, attached to handles)
- Our sheet in app zone (bottom of viewport)
- Two separate spatial zones — no overlap
- After `clear()` calls `removeAllRanges()`, native menu disappears with the selection

Android Chrome: add `e.preventDefault()` on `contextmenu` event for `article.prose` (in `AnnotationLayer` mount effect, gated by `isCoarsePointer`). Suppresses Android's context menu. No effect on iOS but no harm.

### Sheet animation

CSS-only:

```css
.sheet-enter   { transform: translateY(100%); }
.sheet-active  { transform: translateY(0); transition: transform 180ms ease-out; }
.sheet-exit    { transform: translateY(0); }
.sheet-leaving { transform: translateY(100%); transition: transform 140ms ease-in; }
```

Driven by `visible`/`shouldRender` from `useDelayedUnmount`. No spring physics, no Vaul/Radix Drawer dependency.

### Drag-to-dismiss

Single `useState` for `dragOffsetY`. `onTouchStart` records start Y; `onTouchMove` updates `dragOffsetY = Math.max(0, currentY - startY)` and applies as `transform: translateY({dragOffsetY}px)`; `onTouchEnd`: if offset > 60px → `clear()`, else snap back (`dragOffsetY = 0`). Drag handle is the only interactive area for drag — taps on buttons are not affected.

### Viewport / keyboard handling

- Sheet positioned with `bottom: env(safe-area-inset-bottom)`
- Height calc with `100dvh` (dynamic viewport height) — modern browsers shift dvh when keyboard opens, so sheet sticks above keyboard automatically
- `overscroll-behavior: contain` on sheet to prevent body scroll bleed when scrolling tag row

### z-index

Use `Z.TOPMOST` (50) from `src/lib/zIndex.ts` (created in tech-debt wave 2026-05-04).

---

## Data flow

Identical to desktop — `MobileAnnotationSheet` calls the same `useAnnotationStore.addAnnotation()`. Store handles Supabase write + realtime subscription unchanged. No new store, no new types, no schema changes.

---

## Error handling

- `addAnnotation` rejection: console.error + dismiss sheet (matches current desktop silent-handling pattern; surfacing toasts is a separate UX wave)
- `selection.savedRange` invalid (e.g. content edited mid-session): `buildAnchorContext` returns empty string; annotation still saves with empty anchor context — degraded but non-breaking
- `useTextSelection` running outside browser (SSR): early return on `typeof window === 'undefined'` (defensive only — Vite is CSR)

---

## Tests

### `src/__tests__/useTextSelection.test.ts` (new)

- Pointer trigger: simulated `selectionchange` event with mock `getSelection()` returning a non-collapsed range inside container → state populated after debounce
- Pointer trigger: range outside container → state stays `null`
- Pointer trigger: text length below `minLength` → state stays `null`
- Touch trigger: `selectionchange` does NOT fire state update (only `touchend` does)
- Touch trigger: `touchend` with valid selection → state populated immediately (no debounce)
- `clear()` empties state and calls `removeAllRanges`

### `src/__tests__/mobileAnnotationSheet.test.tsx` (new)

- Renders nothing when no selection
- Renders sheet when selection present
- Tap Highlight dispatches `addAnnotation` with `note: ''` and current `selectedTagId`
- Tap ✎ enters note mode (input visible, Save button replaces Highlight)
- Save in note mode dispatches `addAnnotation` with `noteText`
- Tap ✕ calls `clear()` without dispatching
- Tag pill tap toggles `selectedTagId`

### Existing tests

All 106 must continue passing. `BubbleToolbar` refactor is behaviour-preserving — no test changes expected, but if rendering structure shifts subtly, snapshot/DOM assertions may need adjustment.

---

## File-level changes

| File | Change |
|---|---|
| `src/lib/useTextSelection.ts` | NEW — extracted selection-detection hook |
| `src/components/reader/MobileAnnotationSheet.tsx` | NEW — bottom sheet component |
| `src/components/reader/BubbleToolbar.tsx` | Refactor — consume `useTextSelection`, drop inline `selectionchange` useEffect (~45 lines deleted), no behaviour change |
| `src/components/reader/AnnotationLayer.tsx` | Add `isCoarsePointer` constant + render-branch between `BubbleToolbar` and `MobileAnnotationSheet`; add Android `contextmenu` suppression effect (gated) |
| `src/__tests__/useTextSelection.test.ts` | NEW |
| `src/__tests__/mobileAnnotationSheet.test.tsx` | NEW |

No store changes. No schema changes. No new dependencies.

---

## Acceptance criteria

1. On a desktop browser (mouse pointer), text selection in a doc shows the existing `BubbleToolbar` with no visual or behaviour change. All 106 tests pass.
2. On a phone (iPhone Safari, Android Chrome), long-press selecting text in a doc, then lifting finger, slides up a bottom sheet within 200ms.
3. The sheet shows: selected-text excerpt, scrollable tag pills, Highlight CTA, ✎ button, ✕ button.
4. Tapping a tag pill toggles its selected state. Tapping Highlight saves an annotation with that tag (or none) and clears the sheet.
5. Tapping ✎ reveals a note input with auto-focus. Typing then tapping Save creates an annotation with the note. ↵ in input also saves.
6. Tapping ✕, swiping down on the drag handle past 60px, or tapping outside the sheet dismisses without saving.
7. On Android Chrome, the native `contextmenu` does not appear over the selection.
8. On iOS, the native selection menu appears as expected (cannot be suppressed); our sheet sits at the bottom and does not collide spatially.
9. Note input opening the on-screen keyboard does not push the sheet behind the keyboard — input remains visible.

---

## Risks / open questions

- iPad native menu persistence may still feel awkward despite spatial separation. Acceptable for v1; revisit if pain-points emerge.
- `(pointer: coarse)` evaluated once at mount — switching from touchscreen laptop to mouse mid-session would not switch surfaces. Acceptable trade-off; rare scenario.
- `dvh` browser support: iOS 15.4+ and Android Chrome recent versions. Older devices may have a sliver of dead space below sheet. Acceptable.
