# Mobile Annotation UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile bottom-sheet annotation surface (`MobileAnnotationSheet`) alongside the existing desktop `BubbleToolbar`, sharing a new `useTextSelection` hook. Touch devices get highlight + tag + optional note via the sheet; desktop behaviour unchanged.

**Architecture:** Extract selection-detection from `BubbleToolbar` into `useTextSelection` (pointer or touch trigger). `AnnotationLayer` chooses surface via `window.matchMedia('(pointer: coarse)')`. New `MobileAnnotationSheet` consumes the same hook with `trigger: 'touch'`. Existing tech-debt utilities reused: `useDelayedUnmount`, `useClickOutside`, `Z` constants. No new runtime dependencies, no schema changes.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Vitest + happy-dom + @testing-library/react, Lucide icons, Supabase (via `useAnnotationStore`).

---

## Reference: spec

`specs/2026-05-04-mobile-annotation-design.md` — design doc this plan implements.

## Reference: existing files this plan depends on

- `src/lib/useClickOutside.ts` — exposes `useClickOutside(ref, onOutside, { deferArm })`
- `src/lib/useDelayedUnmount.ts` — exposes `useDelayedUnmount(visible, delayMs)`
- `src/lib/zIndex.ts` — exposes `Z.TOPMOST` (= 50)
- `src/lib/highlights.ts` — exposes `buildAnchorContext(range)` and `getHighlightColorForTags`
- `src/store/annotationStore.ts` — `addAnnotation({ docId, type, text, anchorContext, tagIds, note, connectionUrl })`
- `src/store/tagStore.ts` — `useTagStore((s) => s.tags)`
- `src/components/reader/BubbleToolbar.tsx` — refactor target (current ~419 lines)
- `src/components/reader/AnnotationLayer.tsx` — render-branch target
- `src/__tests__/setup.ts` — mocks Supabase by default

## Reference: useAnnotationStore.addAnnotation type

```ts
type NewAnnotation = Omit<{
  id: string;
  docId: string;
  type: 'highlight' | 'note' | 'quick-capture';
  text: string;
  anchorContext: string;
  tagIds: string[];
  note: string;
  connectionUrl: string;
  mapNodeId?: string;
  createdAt: string;
}, 'id' | 'createdAt'>;
addAnnotation: (a: NewAnnotation) => Promise<string>;
```

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/lib/useTextSelection.ts` | NEW | Hook: detect text selection in a container, expose `{ selection, clear }` |
| `src/components/reader/MobileAnnotationSheet.tsx` | NEW | Bottom-sheet UI for touch devices |
| `src/components/reader/BubbleToolbar.tsx` | MODIFY | Consume `useTextSelection`, drop inline selection useEffect |
| `src/components/reader/AnnotationLayer.tsx` | MODIFY | Render-branch + Android contextmenu suppression |
| `src/__tests__/useTextSelection.test.ts` | NEW | Unit tests for hook + pure helper |
| `src/__tests__/mobileAnnotationSheet.test.tsx` | NEW | Component tests for the sheet |

---

## Task 1: Pure helper `pickValidSelection` (TDD)

The hook needs a pure function to validate a `Selection` against the container and minimum length. Pure → easy to test. Hook layers DOM events on top.

**Files:**
- Create: `src/lib/useTextSelection.ts`
- Test: `src/__tests__/useTextSelection.test.ts`

- [ ] **Step 1: Write the failing test**

Write to `src/__tests__/useTextSelection.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pickValidSelection } from '@/lib/useTextSelection';

function makeContainer(html: string): HTMLElement {
  const div = document.createElement('div');
  div.className = 'prose';
  div.innerHTML = html;
  document.body.appendChild(div);
  return div;
}

function makeSelection(node: Node, start: number, end: number): Selection {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  return sel;
}

describe('pickValidSelection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns null for collapsed selection', () => {
    const c = makeContainer('hello world');
    const sel = makeSelection(c.firstChild!, 3, 3);
    expect(pickValidSelection(sel, '.prose', 3)).toBeNull();
  });

  it('returns null when selection text is shorter than minLength', () => {
    const c = makeContainer('hello world');
    const sel = makeSelection(c.firstChild!, 0, 2);
    expect(pickValidSelection(sel, '.prose', 3)).toBeNull();
  });

  it('returns null when selection is outside the container', () => {
    makeContainer('inside container');
    const outside = document.createElement('p');
    outside.textContent = 'outside text here';
    document.body.appendChild(outside);
    const sel = makeSelection(outside.firstChild!, 0, 7);
    expect(pickValidSelection(sel, '.prose', 3)).toBeNull();
  });

  it('returns SelectionState for a valid selection inside container', () => {
    const c = makeContainer('the quick brown fox');
    const sel = makeSelection(c.firstChild!, 4, 9);
    const result = pickValidSelection(sel, '.prose', 3);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('quick');
    expect(result!.savedRange).toBeInstanceOf(Range);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run useTextSelection`
Expected: FAIL — module `@/lib/useTextSelection` does not export `pickValidSelection`.

- [ ] **Step 3: Implement the helper**

Write to `src/lib/useTextSelection.ts`:

```ts
export type SelectionState = {
  text: string;
  savedRange: Range;
  selectionRect: DOMRect;
};

export function pickValidSelection(
  sel: Selection | null,
  containerSelector: string,
  minLength: number,
): SelectionState | null {
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const text = sel.toString().trim();
  if (text.length < minLength) return null;
  const anchor = sel.anchorNode;
  const el =
    anchor?.nodeType === Node.TEXT_NODE
      ? (anchor as Text).parentElement
      : (anchor as Element | null);
  if (!el?.closest(containerSelector)) return null;
  const range = sel.getRangeAt(0);
  return {
    text,
    savedRange: range.cloneRange(),
    selectionRect: range.getBoundingClientRect(),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --run useTextSelection`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/useTextSelection.ts src/__tests__/useTextSelection.test.ts
git commit -m "feat(useTextSelection): pure helper pickValidSelection with tests"
```

---

## Task 2: `useTextSelection` hook — pointer mode

Adds the React hook on top of the pure helper. Pointer mode listens to `selectionchange` with 80ms debounce. Skips updates when focus is inside an element marked `data-highlight-popover="true"` (matches existing BubbleToolbar behaviour).

**Files:**
- Modify: `src/lib/useTextSelection.ts`
- Test: `src/__tests__/useTextSelection.test.ts`

- [ ] **Step 1: Add the failing hook tests**

Append to `src/__tests__/useTextSelection.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react';
import { useTextSelection } from '@/lib/useTextSelection';

describe('useTextSelection (pointer mode)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.getSelection()?.removeAllRanges();
  });

  it('captures selection after selectionchange fires', async () => {
    const c = makeContainer('the quick brown fox');
    const { result } = renderHook(() =>
      useTextSelection({ containerSelector: '.prose', trigger: 'pointer' }),
    );
    expect(result.current.selection).toBeNull();
    act(() => {
      makeSelection(c.firstChild!, 4, 9);
      document.dispatchEvent(new Event('selectionchange'));
    });
    await act(() => new Promise((r) => setTimeout(r, 100)));
    expect(result.current.selection?.text).toBe('quick');
  });

  it('clear() empties selection', async () => {
    const c = makeContainer('the quick brown fox');
    const { result } = renderHook(() =>
      useTextSelection({ containerSelector: '.prose', trigger: 'pointer' }),
    );
    act(() => {
      makeSelection(c.firstChild!, 4, 9);
      document.dispatchEvent(new Event('selectionchange'));
    });
    await act(() => new Promise((r) => setTimeout(r, 100)));
    expect(result.current.selection).not.toBeNull();
    act(() => result.current.clear());
    expect(result.current.selection).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run useTextSelection`
Expected: FAIL — `useTextSelection` is not exported.

- [ ] **Step 3: Implement the hook (pointer branch only for now)**

Append to `src/lib/useTextSelection.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  containerSelector: string;
  minLength?: number;
  trigger: 'pointer' | 'touch';
}

export function useTextSelection({
  containerSelector,
  minLength = 3,
  trigger,
}: Options): {
  selection: SelectionState | null;
  clear: () => void;
} {
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const evaluate = useCallback(() => {
    const active = document.activeElement;
    if (active?.closest('[data-highlight-popover="true"]')) return;
    const next = pickValidSelection(window.getSelection(), containerSelector, minLength);
    setSelection(next);
  }, [containerSelector, minLength]);

  useEffect(() => {
    if (trigger !== 'pointer') return;
    function onSelectionChange() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(evaluate, 80);
    }
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trigger, evaluate]);

  const clear = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  return { selection, clear };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --run useTextSelection`
Expected: PASS — 6 tests total.

- [ ] **Step 5: Commit**

```bash
git add src/lib/useTextSelection.ts src/__tests__/useTextSelection.test.ts
git commit -m "feat(useTextSelection): pointer-mode hook with debounced selectionchange"
```

---

## Task 3: `useTextSelection` hook — touch mode

Touch mode listens to `touchend` only. No `selectionchange` listener — sheet only appears once finger lifts, never during handle drag.

**Files:**
- Modify: `src/lib/useTextSelection.ts`
- Test: `src/__tests__/useTextSelection.test.ts`

- [ ] **Step 1: Add failing test for touch mode**

Append to `src/__tests__/useTextSelection.test.ts`:

```ts
describe('useTextSelection (touch mode)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.getSelection()?.removeAllRanges();
  });

  it('does NOT capture on selectionchange in touch mode', async () => {
    const c = makeContainer('the quick brown fox');
    const { result } = renderHook(() =>
      useTextSelection({ containerSelector: '.prose', trigger: 'touch' }),
    );
    act(() => {
      makeSelection(c.firstChild!, 4, 9);
      document.dispatchEvent(new Event('selectionchange'));
    });
    await act(() => new Promise((r) => setTimeout(r, 100)));
    expect(result.current.selection).toBeNull();
  });

  it('captures on touchend in touch mode', () => {
    const c = makeContainer('the quick brown fox');
    const { result } = renderHook(() =>
      useTextSelection({ containerSelector: '.prose', trigger: 'touch' }),
    );
    act(() => {
      makeSelection(c.firstChild!, 4, 9);
      document.dispatchEvent(new Event('touchend'));
    });
    expect(result.current.selection?.text).toBe('quick');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run useTextSelection`
Expected: FAIL — touchend test fails because no listener wired.

- [ ] **Step 3: Add touch branch to the hook**

In `src/lib/useTextSelection.ts`, add a second `useEffect` after the pointer one:

```ts
  useEffect(() => {
    if (trigger !== 'touch') return;
    function onTouchEnd() {
      evaluate();
    }
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [trigger, evaluate]);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --run useTextSelection`
Expected: PASS — 8 tests total.

- [ ] **Step 5: Commit**

```bash
git add src/lib/useTextSelection.ts src/__tests__/useTextSelection.test.ts
git commit -m "feat(useTextSelection): touch-mode hook listens to touchend only"
```

---

## Task 4: Refactor `BubbleToolbar` to consume `useTextSelection`

Behaviour-preserving. Drop the inline `selectionchange` useEffect (current lines ~38-83) and the local `selectionRect` / `savedRange` / `selectedText` state. Use `selection` from the hook instead. UI state for tag menu, note input, etc. stays in `BubbleToolbar`.

**Files:**
- Modify: `src/components/reader/BubbleToolbar.tsx`

- [ ] **Step 1: Read the current file**

Run: `cat src/components/reader/BubbleToolbar.tsx | head -100`
Note current state: `useState<DOMRect | null>` (selectionRect), `useState<Range | null>` (savedRange), `useState('')` (selectedText), `useState(false)` (visible). All four are managed by the inline `selectionchange` effect.

- [ ] **Step 2: Replace selection state and inline effect**

Edit `src/components/reader/BubbleToolbar.tsx`:

Replace the imports block at the top — add `useTextSelection`:

```tsx
import {useTextSelection} from '@/lib/useTextSelection';
```

Replace these four lines near the top of the component:

```tsx
const [visible, setVisible] = useState(false);
const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
const [pos, setPos] = useState({top: -9999, left: -9999});
const [savedRange, setSavedRange] = useState<Range | null>(null);
const [selectedText, setSelectedText] = useState('');
```

with:

```tsx
const {selection, clear} = useTextSelection({
  containerSelector: 'article.prose',
  trigger: 'pointer',
});
const visible = selection !== null;
const selectionRect = selection?.selectionRect ?? null;
const savedRange = selection?.savedRange ?? null;
const selectedText = selection?.text ?? '';
const [pos, setPos] = useState({top: -9999, left: -9999});
```

Delete the entire inline `useEffect(() => { function onSelectionChange()… }, [])` block (the one with the 80ms debounce and `setVisible(true)` calls).

Replace each `setVisible(false)` call with `clear()`. Specifically inside `doHighlight`, `handleCapture`, `handleAddNode`, `handleNodeSelected`, and the Escape key handler.

Add a useEffect that resets per-action UI state when a new selection arrives (replaces what the deleted block did inline):

```tsx
useEffect(() => {
  if (!selection) return;
  setSelectedTagId(null);
  setShowTagMenu(false);
  setShowNoteInput(false);
  setNoteText('');
  setShowNodePicker(false);
}, [selection]);
```

Place this useEffect after the `useTextSelection` call.

Remove `setSavedRange`, `setSelectedText`, `setSelectionRect`, `setVisible` calls anywhere they remain — none should be left.

- [ ] **Step 3: Run the existing test suite to verify nothing broke**

Run: `npm test -- --run`
Expected: PASS — 114 tests total (106 original + 4 from Task 1 + 2 from Task 2 + 2 from Task 3 = 114). No regressions from BubbleToolbar refactor.

If any test fails because BubbleToolbar's selection state shape changed, that's a regression — fix the BubbleToolbar refactor (do not edit the test).

- [ ] **Step 4: TypeScript check**

Run: `npm run build`
Expected: clean build with no TS errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/reader/BubbleToolbar.tsx
git commit -m "refactor(BubbleToolbar): consume useTextSelection hook"
```

---

## Task 5: `MobileAnnotationSheet` — skeleton + render gate + tag pills + Highlight action

Build the default state of the bottom sheet: drag handle, selected-text excerpt, scrollable tag pills, Highlight CTA, ✎, ✕. Implement only the `Highlight` action (no note mode yet).

**Files:**
- Create: `src/components/reader/MobileAnnotationSheet.tsx`
- Test: `src/__tests__/mobileAnnotationSheet.test.tsx`

- [ ] **Step 1: Write the failing test**

Write to `src/__tests__/mobileAnnotationSheet.test.tsx`:

```tsx
import {describe, it, expect, beforeEach, vi} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import {MobileAnnotationSheet} from '@/components/reader/MobileAnnotationSheet';
import {useAnnotationStore} from '@/store/annotationStore';
import {useTagStore} from '@/store/tagStore';

function selectInProse(text: string) {
  const article = document.createElement('article');
  article.className = 'prose';
  article.textContent = `prefix ${text} suffix`;
  document.body.appendChild(article);
  const node = article.firstChild!;
  const start = (article.textContent ?? '').indexOf(text);
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, start + text.length);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  document.dispatchEvent(new Event('touchend'));
}

beforeEach(() => {
  document.body.innerHTML = '';
  window.getSelection()?.removeAllRanges();
  useAnnotationStore.setState({annotations: [], showAnnotations: true});
  useTagStore.setState({
    tags: [
      {id: 't1', name: 'Key point', color: '#facc15'},
      {id: 't2', name: 'Question', color: '#60a5fa'},
    ],
  });
});

describe('MobileAnnotationSheet', () => {
  it('renders nothing when there is no selection', () => {
    render(<MobileAnnotationSheet pageUrl="doc-1" />);
    expect(screen.queryByRole('dialog', {name: /annotate/i})).toBeNull();
  });

  it('renders sheet with selected text after touchend', () => {
    render(<MobileAnnotationSheet pageUrl="doc-1" />);
    selectInProse('quick brown fox');
    expect(screen.getByRole('dialog', {name: /annotate/i})).toBeInTheDocument();
    expect(screen.getByText(/quick brown fox/)).toBeInTheDocument();
  });

  it('renders tag pills from tag store', () => {
    render(<MobileAnnotationSheet pageUrl="doc-1" />);
    selectInProse('quick brown fox');
    expect(screen.getByRole('button', {name: /key point/i})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /question/i})).toBeInTheDocument();
  });

  it('Highlight button dispatches addAnnotation', async () => {
    const spy = vi.spyOn(useAnnotationStore.getState(), 'addAnnotation')
      .mockResolvedValue('new-id');
    render(<MobileAnnotationSheet pageUrl="doc-1" />);
    selectInProse('quick brown fox');
    fireEvent.click(screen.getByRole('button', {name: /^highlight$/i}));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'highlight',
      docId: 'doc-1',
      text: 'quick brown fox',
      tagIds: [],
      note: '',
    }));
  });

  it('tag pill toggles selectedTagId; Highlight then includes tag', async () => {
    const spy = vi.spyOn(useAnnotationStore.getState(), 'addAnnotation')
      .mockResolvedValue('new-id');
    render(<MobileAnnotationSheet pageUrl="doc-1" />);
    selectInProse('quick brown fox');
    fireEvent.click(screen.getByRole('button', {name: /key point/i}));
    fireEvent.click(screen.getByRole('button', {name: /^highlight$/i}));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({tagIds: ['t1']}));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run mobileAnnotationSheet`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the component**

Write to `src/components/reader/MobileAnnotationSheet.tsx`:

```tsx
import {useEffect, useRef, useState} from 'react';
import {Pencil} from 'lucide-react';
import {useTextSelection} from '@/lib/useTextSelection';
import {useTagStore} from '@/store/tagStore';
import {useAnnotationStore} from '@/store/annotationStore';
import {useDelayedUnmount} from '@/lib/useDelayedUnmount';
import {buildAnchorContext} from '@/lib/highlights';
import {Z} from '@/lib/zIndex';

interface MobileAnnotationSheetProps {
  pageUrl: string;
  topicId?: string;
}

export function MobileAnnotationSheet({pageUrl}: MobileAnnotationSheetProps) {
  const {selection, clear} = useTextSelection({
    containerSelector: 'article.prose',
    trigger: 'touch',
  });
  const tags = useTagStore((s) => s.tags);
  const addAnnotation = useAnnotationStore((s) => s.addAnnotation);
  const sheetRef = useRef<HTMLDivElement>(null);

  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  const visible = selection !== null;
  const shouldRender = useDelayedUnmount(visible, 160);

  // Reset per-selection UI state when a new selection arrives
  useEffect(() => {
    if (!selection) return;
    setSelectedTagId(null);
  }, [selection]);

  async function handleHighlight() {
    if (!selection) return;
    await addAnnotation({
      type: 'highlight',
      docId: pageUrl,
      text: selection.text,
      anchorContext: buildAnchorContext(selection.savedRange),
      tagIds: selectedTagId ? [selectedTagId] : [],
      note: '',
      connectionUrl: '',
    });
    clear();
  }

  function handleCancel() {
    clear();
  }

  if (!shouldRender) return null;

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-label="Annotate selection"
      data-highlight-popover="true"
      className={[
        'fixed inset-x-0 bottom-0',
        'rounded-t-2xl border-t border-[var(--color-rule)] bg-[var(--color-card)]',
        'shadow-[0_-8px_32px_rgba(0,0,0,0.32)]',
        'transition-transform duration-180 ease-out',
        visible ? 'translate-y-0' : 'translate-y-full',
      ].join(' ')}
      style={{
        zIndex: Z.TOPMOST,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        overscrollBehavior: 'contain',
      }}
    >
      <div className="flex flex-col gap-2.5 px-4 pt-2 pb-3">
        {/* Drag handle */}
        <div className="mx-auto w-8 h-[3px] bg-[var(--color-rule)] rounded-full" />

        {/* Selected-text excerpt */}
        <div className="border-l-2 border-[var(--color-rule)] pl-2 italic text-[11px] text-[var(--color-muted-foreground)] line-clamp-2">
          "{selection?.text ?? ''}"
        </div>

        {/* Tag pills (horizontal scroll) */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{WebkitOverflowScrolling: 'touch'}}>
          {tags.map((tag) => {
            const active = selectedTagId === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => setSelectedTagId(active ? null : tag.id)}
                className={[
                  'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px]',
                  active
                    ? 'border-transparent text-[var(--color-foreground)]'
                    : 'border-[var(--color-border)] text-[var(--color-muted-foreground)]',
                ].join(' ')}
                style={active ? {background: tag.color + '38', borderColor: tag.color} : {}}
              >
                <span className="h-2 w-2 rounded-full" style={{background: tag.color}} />
                {tag.name}
              </button>
            );
          })}
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleHighlight()}
            className="flex-1 rounded-lg bg-[var(--color-primary)] px-3 py-2.5 text-[13px] font-semibold text-[var(--color-primary-foreground)]"
          >
            Highlight
          </button>
          <button
            type="button"
            aria-label="Add note"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-[var(--color-foreground)]"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            aria-label="Cancel"
            onClick={handleCancel}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-[var(--color-muted-foreground)]"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --run mobileAnnotationSheet`
Expected: PASS — 5 tests pass. The "Add note" button exists but does nothing yet — that's expected, no test for it yet.

- [ ] **Step 5: Build check**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 6: Commit**

```bash
git add src/components/reader/MobileAnnotationSheet.tsx src/__tests__/mobileAnnotationSheet.test.tsx
git commit -m "feat(MobileAnnotationSheet): default state with tag pills and Highlight action"
```

---

## Task 6: `MobileAnnotationSheet` — note mode

Tap the ✎ button → input replaces tag/highlight row; Save creates highlight + note.

**Files:**
- Modify: `src/components/reader/MobileAnnotationSheet.tsx`
- Modify: `src/__tests__/mobileAnnotationSheet.test.tsx`

- [ ] **Step 1: Add the failing test**

Append to `src/__tests__/mobileAnnotationSheet.test.tsx`:

```tsx
describe('MobileAnnotationSheet — note mode', () => {
  it('tapping pencil reveals note input and Save button', () => {
    render(<MobileAnnotationSheet pageUrl="doc-1" />);
    selectInProse('quick brown fox');
    fireEvent.click(screen.getByRole('button', {name: /add note/i}));
    expect(screen.getByPlaceholderText(/add a note/i)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /save highlight/i})).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /^highlight$/i})).toBeNull();
  });

  it('typing then Save dispatches addAnnotation with note text', async () => {
    const spy = vi.spyOn(useAnnotationStore.getState(), 'addAnnotation')
      .mockResolvedValue('new-id');
    render(<MobileAnnotationSheet pageUrl="doc-1" />);
    selectInProse('quick brown fox');
    fireEvent.click(screen.getByRole('button', {name: /add note/i}));
    const input = screen.getByPlaceholderText(/add a note/i);
    fireEvent.change(input, {target: {value: 'pivotal moment'}});
    fireEvent.click(screen.getByRole('button', {name: /save highlight/i}));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'highlight',
      note: 'pivotal moment',
    }));
  });

  it('Enter in note input also saves', async () => {
    const spy = vi.spyOn(useAnnotationStore.getState(), 'addAnnotation')
      .mockResolvedValue('new-id');
    render(<MobileAnnotationSheet pageUrl="doc-1" />);
    selectInProse('quick brown fox');
    fireEvent.click(screen.getByRole('button', {name: /add note/i}));
    const input = screen.getByPlaceholderText(/add a note/i);
    fireEvent.change(input, {target: {value: 'short'}});
    fireEvent.keyDown(input, {key: 'Enter'});
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({note: 'short'}));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run mobileAnnotationSheet`
Expected: FAIL — note input not implemented.

- [ ] **Step 3: Add note mode to the component**

Edit `src/components/reader/MobileAnnotationSheet.tsx`:

Add new state next to `selectedTagId`:

```tsx
const [noteMode, setNoteMode] = useState(false);
const [noteText, setNoteText] = useState('');
const noteInputRef = useRef<HTMLInputElement>(null);
```

Update the per-selection reset effect to also reset note state:

```tsx
useEffect(() => {
  if (!selection) return;
  setSelectedTagId(null);
  setNoteMode(false);
  setNoteText('');
}, [selection]);
```

Update `handleHighlight` to use `noteText`:

```tsx
async function handleHighlight() {
  if (!selection) return;
  await addAnnotation({
    type: 'highlight',
    docId: pageUrl,
    text: selection.text,
    anchorContext: buildAnchorContext(selection.savedRange),
    tagIds: selectedTagId ? [selectedTagId] : [],
    note: noteText,
    connectionUrl: '',
  });
  clear();
}
```

Add focus effect for the note input:

```tsx
useEffect(() => {
  if (noteMode) noteInputRef.current?.focus();
}, [noteMode]);
```

Replace the action-row JSX with conditional rendering:

```tsx
{noteMode ? (
  <>
    <input
      ref={noteInputRef}
      type="text"
      value={noteText}
      onChange={(e) => setNoteText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          void handleHighlight();
        }
        if (e.key === 'Escape') {
          setNoteMode(false);
          setNoteText('');
        }
      }}
      placeholder="Add a note…"
      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-vellum)] px-3 py-2 text-[13px] text-[var(--color-foreground)] outline-none focus:ring-1 ring-[var(--color-primary)]/50"
    />
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void handleHighlight()}
        className="flex-1 rounded-lg bg-[var(--color-primary)] px-3 py-2.5 text-[13px] font-semibold text-[var(--color-primary-foreground)]"
      >
        Save highlight
      </button>
      <button
        type="button"
        aria-label="Cancel"
        onClick={handleCancel}
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-[var(--color-muted-foreground)]"
      >
        ✕
      </button>
    </div>
  </>
) : (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => void handleHighlight()}
      className="flex-1 rounded-lg bg-[var(--color-primary)] px-3 py-2.5 text-[13px] font-semibold text-[var(--color-primary-foreground)]"
    >
      Highlight
    </button>
    <button
      type="button"
      aria-label="Add note"
      onClick={() => setNoteMode(true)}
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-[var(--color-foreground)]"
    >
      <Pencil size={14} />
    </button>
    <button
      type="button"
      aria-label="Cancel"
      onClick={handleCancel}
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-[var(--color-muted-foreground)]"
    >
      ✕
    </button>
  </div>
)}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --run mobileAnnotationSheet`
Expected: PASS — 8 tests total.

- [ ] **Step 5: Commit**

```bash
git add src/components/reader/MobileAnnotationSheet.tsx src/__tests__/mobileAnnotationSheet.test.tsx
git commit -m "feat(MobileAnnotationSheet): note mode replaces action row with input + Save"
```

---

## Task 7: `MobileAnnotationSheet` — drag-to-dismiss + tap-outside dismiss

Drag handle down 60px → dismiss. Tap anywhere outside the sheet → dismiss (uses existing `useClickOutside`).

**Files:**
- Modify: `src/components/reader/MobileAnnotationSheet.tsx`
- Modify: `src/__tests__/mobileAnnotationSheet.test.tsx`

- [ ] **Step 1: Add failing test for ✕ dismiss + tap-outside dismiss**

Append to `src/__tests__/mobileAnnotationSheet.test.tsx`:

```tsx
describe('MobileAnnotationSheet — dismissal', () => {
  it('Cancel (✕) dismisses without saving', () => {
    const spy = vi.spyOn(useAnnotationStore.getState(), 'addAnnotation')
      .mockResolvedValue('new-id');
    render(<MobileAnnotationSheet pageUrl="doc-1" />);
    selectInProse('quick brown fox');
    expect(screen.getByRole('dialog', {name: /annotate/i})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: /^cancel$/i}));
    expect(spy).not.toHaveBeenCalled();
  });

  it('mousedown outside the sheet dismisses', async () => {
    render(<MobileAnnotationSheet pageUrl="doc-1" />);
    selectInProse('quick brown fox');
    expect(screen.getByRole('dialog', {name: /annotate/i})).toBeInTheDocument();
    // useClickOutside is configured with deferArm: true — wait one tick for
    // its arming setTimeout(0) to fire before our mousedown can dismiss.
    await new Promise((r) => setTimeout(r, 10));
    fireEvent.mouseDown(document.body);
    // useDelayedUnmount keeps the dialog mounted for 160ms after visible flips false
    await new Promise((r) => setTimeout(r, 200));
    expect(screen.queryByRole('dialog', {name: /annotate/i})).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run mobileAnnotationSheet`
Expected: FAIL — tap-outside not wired.

- [ ] **Step 3: Wire useClickOutside**

Edit `src/components/reader/MobileAnnotationSheet.tsx`:

Add import:

```tsx
import {useClickOutside} from '@/lib/useClickOutside';
```

Add a single line inside the component, after `shouldRender` is computed:

```tsx
useClickOutside(sheetRef, clear, {deferArm: true});
```

`deferArm: true` prevents the same touch that opened the sheet from immediately closing it.

- [ ] **Step 4: Add drag-to-dismiss**

Add state for drag offset:

```tsx
const [dragOffsetY, setDragOffsetY] = useState(0);
const dragStartYRef = useRef<number | null>(null);
```

Replace the drag-handle JSX:

```tsx
<div
  className="mx-auto w-8 h-[3px] bg-[var(--color-rule)] rounded-full"
  onTouchStart={(e) => {
    dragStartYRef.current = e.touches[0].clientY;
  }}
  onTouchMove={(e) => {
    if (dragStartYRef.current === null) return;
    const dy = e.touches[0].clientY - dragStartYRef.current;
    setDragOffsetY(Math.max(0, dy));
  }}
  onTouchEnd={() => {
    if (dragOffsetY > 60) {
      clear();
    }
    setDragOffsetY(0);
    dragStartYRef.current = null;
  }}
  style={{touchAction: 'none'}}
/>
```

Apply the drag offset to the sheet's transform. Update the root div's `className` and `style` to include the dynamic transform:

```tsx
className={[
  'fixed inset-x-0 bottom-0',
  'rounded-t-2xl border-t border-[var(--color-rule)] bg-[var(--color-card)]',
  'shadow-[0_-8px_32px_rgba(0,0,0,0.32)]',
  dragOffsetY === 0 ? 'transition-transform duration-180 ease-out' : '',
].join(' ')}
style={{
  zIndex: Z.TOPMOST,
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  overscrollBehavior: 'contain',
  transform: visible
    ? `translateY(${dragOffsetY}px)`
    : 'translateY(100%)',
}}
```

Reset `dragOffsetY` when a new selection arrives. Update the per-selection reset effect:

```tsx
useEffect(() => {
  if (!selection) return;
  setSelectedTagId(null);
  setNoteMode(false);
  setNoteText('');
  setDragOffsetY(0);
}, [selection]);
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- --run mobileAnnotationSheet`
Expected: PASS — 10 tests total.

- [ ] **Step 6: Commit**

```bash
git add src/components/reader/MobileAnnotationSheet.tsx src/__tests__/mobileAnnotationSheet.test.tsx
git commit -m "feat(MobileAnnotationSheet): drag-to-dismiss and tap-outside dismiss"
```

---

## Task 8: `AnnotationLayer` — render branch + Android contextmenu suppression

Mount-time pointer detection picks the surface. On coarse pointer, also suppress Android `contextmenu` events.

**Files:**
- Modify: `src/components/reader/AnnotationLayer.tsx`

- [ ] **Step 1: Read the current file**

Run: `cat src/components/reader/AnnotationLayer.tsx`

Note where `<BubbleToolbar />` is rendered (around line 120 of the current file).

- [ ] **Step 2: Add imports and detection**

Edit `src/components/reader/AnnotationLayer.tsx`:

Add imports at the top:

```tsx
import {MobileAnnotationSheet} from './MobileAnnotationSheet';
```

Add module-scope detection at the top of the file, after imports:

```tsx
const isCoarsePointer =
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches;
```

- [ ] **Step 3: Replace BubbleToolbar render with branch**

In the JSX `return (...)` block, replace:

```tsx
<BubbleToolbar
  pageUrl={pageUrl}
  topicId={topicId}
/>
```

with:

```tsx
{isCoarsePointer ? (
  <MobileAnnotationSheet pageUrl={pageUrl} topicId={topicId} />
) : (
  <BubbleToolbar pageUrl={pageUrl} topicId={topicId} />
)}
```

- [ ] **Step 4: Add Android contextmenu suppression**

Add a useEffect inside `AnnotationLayer` (after the existing useEffects), gated on `isCoarsePointer`:

```tsx
useEffect(() => {
  if (!isCoarsePointer) return;
  function suppress(e: Event) {
    const target = e.target as HTMLElement | null;
    if (target?.closest('article.prose')) e.preventDefault();
  }
  document.addEventListener('contextmenu', suppress);
  return () => document.removeEventListener('contextmenu', suppress);
}, []);
```

- [ ] **Step 5: Run the full test suite**

Run: `npm test -- --run`
Expected: PASS — 124 tests total (106 original + 8 from Tasks 1–3 + 10 from Tasks 5–7). On a desktop test environment, `(pointer: coarse)` returns `false`, so `BubbleToolbar` renders and existing tests remain green.

- [ ] **Step 6: Build check**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 7: Commit**

```bash
git add src/components/reader/AnnotationLayer.tsx
git commit -m "feat(AnnotationLayer): render MobileAnnotationSheet on coarse pointer"
```

---

## Task 9: Manual mobile smoke test

Unit tests don't simulate iOS Safari or Android Chrome. Verify acceptance criteria 2–9 of the spec on real devices before marking the wave done.

**Files:** none modified — verification only

- [ ] **Step 1: Start dev server bound to LAN**

Run: `npm run dev -- --host`
Expected output includes a `Network:` URL like `http://192.168.x.x:5173/`.

- [ ] **Step 2: Open the network URL on iPhone Safari**

Navigate to a doc page. Long-press a passage of text:
- Native iOS selection menu appears (system zone, expected — cannot suppress)
- Lift finger
- Bottom sheet slides up within 200ms
- Sheet shows: drag handle, selected-text excerpt, scrollable tag pills, [Highlight] [✎] [✕]

- [ ] **Step 3: Test highlight action**

Tap a tag pill (it activates with color) → tap **Highlight**. Sheet slides down, native selection clears, mark appears in document. Reload the page; mark persists (Supabase write succeeded).

- [ ] **Step 4: Test note mode**

Long-press another passage → lift → tap ✎. Note input appears with focus, on-screen keyboard slides up, sheet stays visible above keyboard. Type a short note → tap **Save highlight**. Sheet closes; mark and note dot both appear.

- [ ] **Step 5: Test dismissal**

Long-press passage → tap ✕. Sheet closes, no annotation saved.
Long-press passage → drag the drag-handle down >60px → release. Sheet closes.
Long-press passage → tap anywhere on the article above the sheet. Sheet closes.

- [ ] **Step 6: Test on Android Chrome**

Same flow as Step 2. Verify: native Android `contextmenu` does NOT appear over the selection (Android-specific suppression).

- [ ] **Step 7: Test on desktop in same browser**

Open the same network URL on a desktop browser with a mouse. Verify: existing `BubbleToolbar` (floating above selection) renders, NOT the bottom sheet. No regression.

- [ ] **Step 8: If any check fails, file a follow-up before declaring done**

Common issues:
- `dvh`/safe-area not respected → check Tailwind v4 has `padding: env(safe-area-inset-bottom, 0px)` honored
- Sheet appears during handle-drag → verify Task 3 didn't accidentally include `selectionchange` listener for touch trigger
- Sheet appears on desktop → verify `isCoarsePointer` reads `false` in dev tools console

---

## Self-review notes

Spec coverage check (every spec section maps to at least one task):

| Spec section | Implemented in |
|---|---|
| `useTextSelection` hook (pointer + touch + clear) | Tasks 1, 2, 3 |
| BubbleToolbar refactor (behaviour-preserving) | Task 4 |
| MobileAnnotationSheet props + render gate | Task 5 |
| Default-state layout (drag handle, excerpt, pills, actions) | Task 5 |
| Tag pill toggle | Task 5 |
| Highlight action → addAnnotation + clear | Task 5 |
| Note-mode layout + auto-focus + ↵-to-save | Task 6 |
| Drag-to-dismiss (>60px) | Task 7 |
| Tap-outside dismiss via useClickOutside | Task 7 |
| Cancel ✕ button | Task 5 + 7 |
| Sheet enter/exit animation | Task 5 (CSS in component) |
| Native menu coexistence — accept | Task 9 (verified manually) |
| Android contextmenu suppression | Task 8 |
| z-index = Z.TOPMOST | Task 5 |
| Safe-area / dvh viewport handling | Task 5 (CSS) |
| `(pointer: coarse)` detection at module scope | Task 8 |
| Tests: useTextSelection | Tasks 1–3 |
| Tests: MobileAnnotationSheet | Tasks 5–7 |
| Existing 106 tests still pass | Task 4 (build + test) and 8 (full suite) |
| Acceptance criteria 1 (desktop unchanged) | Task 4 + 8 |
| Acceptance criteria 2–9 (mobile flows) | Task 9 |
