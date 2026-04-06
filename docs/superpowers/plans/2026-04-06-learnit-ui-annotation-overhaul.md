# LearnIt UI & Annotation Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix MDX frontmatter rendering, replace the annotation popup with a Notion-style bubble toolbar, make annotations visually transform highlighted text, add collapsible sidebar, persist layout state across routes, flip reader/map panels, and add bottom navigation.

**Architecture:** A new `useWorkspaceStore` (Zustand + `persist`) centralises layout state shared across `WorkspaceLayout` and `Sidebar`. The existing `HighlightPopover` is deleted and replaced by `BubbleToolbar` using a `selectionchange`-triggered approach. DOM annotation rendering is extended in `applyOneHighlight` to inject note-dot indicators, supported by a new `NoteTooltip` React component rendered by `AnnotationLayer`.

**Tech Stack:** React 18, Zustand 5 (`persist` middleware), Vitest + `@testing-library/react` + `happy-dom`, Tailwind CSS, `@mdx-js/rollup`, `remark-frontmatter` (to install).

**Spec:** `docs/superpowers/specs/2026-04-06-learnit-ui-annotation-overhaul-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `vite.config.ts` | Modify | Add `remark-frontmatter` plugin |
| `src/store/workspaceStore.ts` | **Create** | Persist layout mode, split %, sidebar collapsed |
| `src/components/workspace/WorkspaceLayout.tsx` | Modify | Read/write `useWorkspaceStore`; update button labels |
| `src/components/layout/Sidebar.tsx` | Modify | Collapsible rail; toggle button; read `useWorkspaceStore` |
| `src/components/layout/Shell.tsx` | Modify | Collapsed-aware sidebar width on desktop |
| `src/index.css` | Modify | Base rules for `mark.handbook-highlight`, `span.handbook-note-dot` |
| `src/lib/highlights.ts` | Modify | Inject note-dot `<span>` after `<mark>` when `hl.note` is set |
| `src/components/reader/HighlightPopover.tsx` | **Delete** | Replaced by BubbleToolbar |
| `src/components/reader/BubbleToolbar.tsx` | **Create** | Notion-style pill bar; `selectionchange` trigger; highlight/note/capture/node actions |
| `src/components/reader/NoteTooltip.tsx` | **Create** | Floating card showing note text; Edit → opens NotePanel |
| `src/components/reader/AnnotationLayer.tsx` | Modify | Swap HighlightPopover → BubbleToolbar; add note-dot click + NoteTooltip rendering |
| `src/components/reader/DocNav.tsx` | **Create** | Prev/next navigation from flattened manifest |
| `src/pages/DocsPage.tsx` | Modify | Swap left/right panels; add DocNav to reader |
| `src/__tests__/workspaceStore.test.ts` | **Create** | Store state transition tests |
| `src/__tests__/docNav.test.tsx` | **Create** | Manifest flattening + prev/next derivation tests |
| `src/__tests__/WorkspaceLayout.test.tsx` | Modify | Update aria-label assertions to match new labels |

---

## Task 1: MDX Frontmatter Fix

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Install remark-frontmatter**

```bash
npm install remark-frontmatter
```

Expected: package added to `package.json` under `dependencies`.

- [ ] **Step 2: Update vite.config.ts**

Replace the `mdx(...)` call so it reads:

```ts
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import path from 'path';

export default defineConfig({
  plugins: [
    {enforce: 'pre', ...mdx({remarkPlugins: [remarkGfm, remarkFrontmatter], providerImportSource: '@mdx-js/react'})},
    react({include: /\.(jsx|js|mdx|md|tsx|ts)$/}),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 3: Verify in browser**

Run `npm run dev`. Navigate to any doc page. Confirm the `---` YAML block is no longer visible at the top of the content.

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts package.json package-lock.json
git commit -m "fix: strip MDX frontmatter via remark-frontmatter plugin"
```

---

## Task 2: workspaceStore

**Files:**
- Create: `src/store/workspaceStore.ts`
- Create: `src/__tests__/workspaceStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/workspaceStore.test.ts`:

```ts
import {describe, it, expect, beforeEach} from 'vitest';
import {useWorkspaceStore} from '@/store/workspaceStore';

beforeEach(() => {
  useWorkspaceStore.getState().reset();
});

describe('useWorkspaceStore', () => {
  it('starts with default state', () => {
    const state = useWorkspaceStore.getState();
    expect(state.mode).toBe('split');
    expect(state.splitPercent).toBe(40);
    expect(state.sidebarCollapsed).toBe(false);
  });

  it('setMode updates mode', () => {
    useWorkspaceStore.getState().setMode('focus-left');
    expect(useWorkspaceStore.getState().mode).toBe('focus-left');
  });

  it('setSplitPercent updates splitPercent', () => {
    useWorkspaceStore.getState().setSplitPercent(60);
    expect(useWorkspaceStore.getState().splitPercent).toBe(60);
  });

  it('setSidebarCollapsed toggles collapsed', () => {
    useWorkspaceStore.getState().setSidebarCollapsed(true);
    expect(useWorkspaceStore.getState().sidebarCollapsed).toBe(true);
  });

  it('reset restores defaults', () => {
    useWorkspaceStore.getState().setMode('focus-right');
    useWorkspaceStore.getState().setSidebarCollapsed(true);
    useWorkspaceStore.getState().reset();
    const state = useWorkspaceStore.getState();
    expect(state.mode).toBe('split');
    expect(state.sidebarCollapsed).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- workspaceStore
```

Expected: FAIL — `Cannot find module '@/store/workspaceStore'`

- [ ] **Step 3: Create the store**

Create `src/store/workspaceStore.ts`:

```ts
import {create} from 'zustand';
import {persist} from 'zustand/middleware';

type PaneMode = 'split' | 'focus-left' | 'focus-right';

interface WorkspaceState {
  mode: PaneMode;
  splitPercent: number;
  sidebarCollapsed: boolean;
  setMode: (mode: PaneMode) => void;
  setSplitPercent: (pct: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  reset: () => void;
}

const DEFAULTS = {mode: 'split' as PaneMode, splitPercent: 40, sidebarCollapsed: false};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setMode: (mode) => set({mode}),
      setSplitPercent: (splitPercent) => set({splitPercent}),
      setSidebarCollapsed: (sidebarCollapsed) => set({sidebarCollapsed}),
      reset: () => set(DEFAULTS),
    }),
    {name: 'learnit-workspace'},
  ),
);
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- workspaceStore
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/store/workspaceStore.ts src/__tests__/workspaceStore.test.ts
git commit -m "feat: add useWorkspaceStore for persistent layout state"
```

---

## Task 3: WorkspaceLayout — store + label updates

**Files:**
- Modify: `src/components/workspace/WorkspaceLayout.tsx`
- Modify: `src/__tests__/WorkspaceLayout.test.tsx`

WorkspaceLayout currently uses local `useState` for `mode` and `splitPercent`. Replace with store reads/writes. Also update `aria-label` values so the left button focuses the reader (after panel flip in Task 8, left = reader).

- [ ] **Step 1: Update WorkspaceLayout.test.tsx**

The existing test references `'Focus map'` for the left button and `'Focus reader'` for the right button. After this task, the labels become `'Focus reader'` (left) and `'Focus map'` (right). Update the test:

```tsx
import {describe, it, expect, beforeEach} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import {WorkspaceLayout} from '@/components/workspace/WorkspaceLayout';
import {useWorkspaceStore} from '@/store/workspaceStore';

beforeEach(() => {
  useWorkspaceStore.getState().reset();
});

const Left = () => <div data-testid="left">Reader</div>;
const Right = () => <div data-testid="right">Map</div>;

describe('WorkspaceLayout', () => {
  it('renders both panes in split mode', () => {
    render(<WorkspaceLayout left={<Left />} right={<Right />} />);
    expect(screen.getByTestId('left')).toBeInTheDocument();
    expect(screen.getByTestId('right')).toBeInTheDocument();
  });

  it('renders resize handle between panes', () => {
    render(<WorkspaceLayout left={<Left />} right={<Right />} />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('can focus left pane (reader)', () => {
    render(<WorkspaceLayout left={<Left />} right={<Right />} />);
    fireEvent.click(screen.getByLabelText('Focus reader'));
    expect(useWorkspaceStore.getState().mode).toBe('focus-left');
  });

  it('can focus right pane (map)', () => {
    render(<WorkspaceLayout left={<Left />} right={<Right />} />);
    fireEvent.click(screen.getByLabelText('Focus map'));
    expect(useWorkspaceStore.getState().mode).toBe('focus-right');
  });

  it('can return to split mode', () => {
    render(<WorkspaceLayout left={<Left />} right={<Right />} />);
    fireEvent.click(screen.getByLabelText('Focus reader'));
    fireEvent.click(screen.getByLabelText('Reset layout'));
    expect(useWorkspaceStore.getState().mode).toBe('split');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- WorkspaceLayout
```

Expected: FAIL — label mismatches.

- [ ] **Step 3: Rewrite WorkspaceLayout.tsx**

```tsx
import {type ReactNode} from 'react';
import {PaneHandle} from './PaneHandle';
import {Maximize2, Minimize2, Columns2} from 'lucide-react';
import {useWorkspaceStore} from '@/store/workspaceStore';

interface WorkspaceLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

export function WorkspaceLayout({left, right}: WorkspaceLayoutProps) {
  const mode = useWorkspaceStore((s) => s.mode);
  const splitPercent = useWorkspaceStore((s) => s.splitPercent);
  const setMode = useWorkspaceStore((s) => s.setMode);
  const setSplitPercent = useWorkspaceStore((s) => s.setSplitPercent);

  const isLeftCollapsed = mode === 'focus-right';
  const isRightCollapsed = mode === 'focus-left';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border shrink-0">
        <button
          aria-label="Focus reader"
          onClick={() => setMode(mode === 'focus-left' ? 'split' : 'focus-left')}
          className="p-1 rounded hover:bg-muted text-foreground/60 hover:text-foreground"
          title="Focus reader"
        >
          <Maximize2 size={14} />
        </button>
        <button
          aria-label="Reset layout"
          onClick={() => setMode('split')}
          className="p-1 rounded hover:bg-muted text-foreground/60 hover:text-foreground"
          title="Split view"
        >
          <Columns2 size={14} />
        </button>
        <button
          aria-label="Focus map"
          onClick={() => setMode(mode === 'focus-right' ? 'split' : 'focus-right')}
          className="p-1 rounded hover:bg-muted text-foreground/60 hover:text-foreground"
          title="Focus map"
        >
          <Minimize2 size={14} />
        </button>
      </div>

      <div id="workspace-container" className="flex flex-1 overflow-hidden">
        <div
          style={{
            width: isLeftCollapsed ? '32px' : mode === 'focus-left' ? '100%' : `${splitPercent}%`,
            flexGrow: mode === 'focus-left' ? 1 : undefined,
            minWidth: isLeftCollapsed ? '32px' : undefined,
          }}
          className={`overflow-auto transition-all duration-200 ${isLeftCollapsed ? 'cursor-pointer' : ''}`}
          onClick={isLeftCollapsed ? () => setMode('split') : undefined}
        >
          {left}
        </div>

        {mode === 'split' && <PaneHandle onResize={setSplitPercent} />}

        <div
          style={{
            flexGrow: mode === 'focus-right' ? 1 : mode === 'split' ? 1 : undefined,
            width: isRightCollapsed ? '32px' : undefined,
            minWidth: isRightCollapsed ? '32px' : undefined,
          }}
          className={`overflow-auto transition-all duration-200 ${isRightCollapsed ? 'cursor-pointer' : ''}`}
          onClick={isRightCollapsed ? () => setMode('split') : undefined}
        >
          {right}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- WorkspaceLayout
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/workspace/WorkspaceLayout.tsx src/__tests__/WorkspaceLayout.test.tsx
git commit -m "feat: wire WorkspaceLayout to useWorkspaceStore; update button labels"
```

---

## Task 4: Collapsible Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/Shell.tsx`

- [ ] **Step 1: Update Sidebar.tsx**

```tsx
import {useState} from 'react';
import {NavLink} from 'react-router';
import {ChevronDown, ChevronRight, ChevronLeft, PanelLeftClose} from 'lucide-react';
import manifest from '@/data/content-manifest.json';
import {useWorkspaceStore} from '@/store/workspaceStore';

type DocEntry = string;
type Section = {label: string; link: string; docs: DocEntry[]};
type Category = {label: string; link: string; sections: Record<string, Section>};
type Manifest = Record<string, Category>;

const typedManifest = manifest as Manifest;

function docPath(categoryKey: string, sectionKey: string, docSlug: string): string {
  return `/docs/${categoryKey}/${sectionKey}/${docSlug}`;
}

function SectionItem({
  categoryKey,
  sectionKey,
  section,
  defaultOpen,
}: {
  categoryKey: string;
  sectionKey: string;
  section: Section;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {section.label}
      </button>
      {open && (
        <div className="ml-3 border-l pl-2 flex flex-col gap-0.5">
          {section.docs.map((slug) => (
            <NavLink
              key={slug}
              to={docPath(categoryKey, sectionKey, slug)}
              className={({isActive}) =>
                [
                  'block px-2 py-1.5 text-xs rounded truncate transition-colors no-underline',
                  isActive
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-medium'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]',
                ].join(' ')
              }
            >
              {slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryItem({categoryKey, category}: {categoryKey: string; category: Category}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-accent)] rounded transition-colors"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {category.label}
      </button>
      {open && (
        <div className="flex flex-col gap-1">
          {Object.entries(category.sections).map(([sectionKey, section], i) => (
            <SectionItem
              key={sectionKey}
              categoryKey={categoryKey}
              sectionKey={sectionKey}
              section={section}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({className = ''}: {className?: string}) {
  const collapsed = useWorkspaceStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useWorkspaceStore((s) => s.setSidebarCollapsed);

  return (
    <aside
      className={[
        'shrink-0 overflow-y-auto border-r bg-[var(--color-card)] py-3 flex flex-col transition-all duration-200',
        collapsed ? 'w-12' : 'w-64',
        className,
      ].join(' ')}
    >
      {!collapsed && (
        <div className="flex-1">
          {Object.entries(typedManifest).map(([key, category]) => (
            <CategoryItem key={key} categoryKey={key} category={category} />
          ))}
        </div>
      )}

      <div className={`mt-auto pt-2 border-t border-[var(--color-border)] flex ${collapsed ? 'justify-center' : 'justify-end px-2'}`}>
        <button
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="p-1.5 rounded hover:bg-[var(--color-accent)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Shell.tsx — no change needed**

`Shell.tsx` renders `<Sidebar className="hidden md:flex md:flex-col" />`. The sidebar now controls its own width via the store, so Shell doesn't need to pass a width. Verify the file is unchanged.

- [ ] **Step 3: Manual verification**

Run `npm run dev`. On the docs page, click the chevron at the bottom of the sidebar. It should collapse to a narrow rail. Click again to expand. Reload the page and confirm the collapsed state is remembered.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: collapsible sidebar with persisted state"
```

---

## Task 5: DocNav — prev/next navigation

**Files:**
- Create: `src/components/reader/DocNav.tsx`
- Create: `src/__tests__/docNav.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/docNav.test.tsx`:

```tsx
import {describe, it, expect} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {DocNav} from '@/components/reader/DocNav';
import {vi} from 'vitest';

// Mock the manifest used by DocNav
vi.mock('@/data/content-manifest.json', () => ({
  default: {
    'lang': {
      label: 'Lang',
      link: 'lang/index',
      sections: {
        'refs': {
          label: 'Refs',
          link: 'lang/refs/index',
          docs: ['alpha', 'beta', 'gamma'],
        },
      },
    },
  },
}));

describe('DocNav', () => {
  it('shows only Next on first doc', () => {
    render(
      <MemoryRouter>
        <DocNav currentPath="/docs/lang/refs/alpha" />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/Alpha/)).not.toBeInTheDocument();
    expect(screen.getByText(/Beta/)).toBeInTheDocument();
  });

  it('shows both Prev and Next on middle doc', () => {
    render(
      <MemoryRouter>
        <DocNav currentPath="/docs/lang/refs/beta" />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Alpha/)).toBeInTheDocument();
    expect(screen.getByText(/Gamma/)).toBeInTheDocument();
  });

  it('shows only Prev on last doc', () => {
    render(
      <MemoryRouter>
        <DocNav currentPath="/docs/lang/refs/gamma" />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Beta/)).toBeInTheDocument();
    expect(screen.queryByText(/Alpha/)).not.toBeInTheDocument();
  });

  it('renders nothing when path not in manifest', () => {
    const {container} = render(
      <MemoryRouter>
        <DocNav currentPath="/docs/unknown/path/here" />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- docNav
```

Expected: FAIL — `Cannot find module '@/components/reader/DocNav'`

- [ ] **Step 3: Create DocNav.tsx**

```tsx
import {Link} from 'react-router';
import manifest from '@/data/content-manifest.json';

type ManifestShape = Record<string, {sections: Record<string, {docs: string[]}>}>;

interface DocEntry {
  path: string;
  label: string;
}

function flattenManifest(): DocEntry[] {
  const entries: DocEntry[] = [];
  const m = manifest as ManifestShape;
  for (const [catKey, cat] of Object.entries(m)) {
    for (const [secKey, sec] of Object.entries(cat.sections)) {
      for (const slug of sec.docs) {
        entries.push({
          path: `/docs/${catKey}/${secKey}/${slug}`,
          label: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        });
      }
    }
  }
  return entries;
}

const ALL_DOCS = flattenManifest();

export function DocNav({currentPath}: {currentPath: string}) {
  const idx = ALL_DOCS.findIndex((e) => e.path === currentPath);
  if (idx === -1) return null;

  const prev = idx > 0 ? ALL_DOCS[idx - 1] : null;
  const next = idx < ALL_DOCS.length - 1 ? ALL_DOCS[idx + 1] : null;

  if (!prev && !next) return null;

  return (
    <nav className="flex justify-between items-center px-6 py-8 mt-4 border-t border-[var(--color-border)]">
      {prev ? (
        <Link
          to={prev.path}
          className="flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] no-underline transition-colors"
        >
          ← {prev.label}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          to={next.path}
          className="flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] no-underline transition-colors"
        >
          {next.label} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- docNav
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/reader/DocNav.tsx src/__tests__/docNav.test.tsx
git commit -m "feat: add DocNav prev/next navigation from manifest"
```

---

## Task 6: CSS annotation base rules + note dot DOM injection

**Files:**
- Modify: `src/index.css`
- Modify: `src/lib/highlights.ts`

- [ ] **Step 1: Add CSS rules to index.css**

Find the bottom of `src/index.css` and append:

```css
/* ── Annotation rendering ── */
mark.handbook-highlight {
  cursor: pointer;
  border-radius: 2px;
  padding: 0 1px;
}

mark.handbook-highlight.ring-2 {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

span.handbook-note-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  vertical-align: super;
  margin-left: 2px;
  cursor: pointer;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Inject note dot in applyOneHighlight**

In `src/lib/highlights.ts`, find the `applyOneHighlight` function. The function currently ends after `range.insertNode(mark)` inside the try/catch. After the entire try/catch block (i.e. after both the `surroundContents` attempt and the fallback), add the note dot injection and then `return`:

Locate this block:

```ts
      try {
        range.surroundContents(mark);
      } catch {
        // Range crosses element boundaries — use extractContents + insertNode
        const fragment = range.extractContents();
        mark.appendChild(fragment);
        range.insertNode(mark);
      }
      return; // Apply each highlight once
```

Replace it with:

```ts
      try {
        range.surroundContents(mark);
      } catch {
        // Range crosses element boundaries — use extractContents + insertNode
        const fragment = range.extractContents();
        mark.appendChild(fragment);
        range.insertNode(mark);
      }

      if (hl.note) {
        const {border} = getHighlightColorForTags(hl.tagIds, tags);
        const dot = document.createElement('span');
        dot.className = 'handbook-note-dot';
        dot.dataset.highlightId = hl.id;
        dot.style.background = border;
        mark.insertAdjacentElement('afterend', dot);
      }

      return; // Apply each highlight once
```

- [ ] **Step 3: Manual verification**

Run `npm run dev`. Create a highlight with a note (use the existing flow for now — BubbleToolbar comes in Task 7). Confirm:
1. The `<mark>` element has a coloured background matching its tag colour.
2. If the highlight has a note, a small coloured dot appears immediately after the marked text.

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/lib/highlights.ts
git commit -m "feat: CSS base rules for highlights; inject note-dot span after annotated marks"
```

---

## Task 7: NoteTooltip component

**Files:**
- Create: `src/components/reader/NoteTooltip.tsx`

- [ ] **Step 1: Create NoteTooltip.tsx**

```tsx
import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {getHighlights} from '@/lib/storage';
import {clampToViewport} from '@/lib/positioning';
import {useDelayedUnmount} from '@/lib/useDelayedUnmount';

interface NoteTooltipProps {
  highlightId: string;
  anchorRect: DOMRect;
  onClose: () => void;
  onEdit: () => void;
}

export function NoteTooltip({highlightId, anchorRect, onClose, onEdit}: NoteTooltipProps) {
  const highlight = getHighlights().find((h) => h.id === highlightId);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({top: -9999, left: -9999});
  const [visible] = useState(true);
  const shouldRender = useDelayedUnmount(visible, 100);

  useLayoutEffect(() => {
    if (!tooltipRef.current) return;
    const {offsetWidth, offsetHeight} = tooltipRef.current;
    const result = clampToViewport({
      anchorRect,
      popoverWidth: offsetWidth,
      popoverHeight: offsetHeight,
      preferredPlacement: 'above',
      margin: 8,
    });
    setPos({top: result.top, left: result.left});
  }, [anchorRect]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    setTimeout(() => document.addEventListener('mousedown', onDocClick), 0);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [onClose]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!highlight?.note || !shouldRender) return null;

  return (
    <div
      ref={tooltipRef}
      data-note-panel
      role="dialog"
      aria-label="Note"
      className="fixed z-50 w-60 rounded-xl border bg-[var(--color-card)] shadow-xl p-3 flex flex-col gap-2"
      style={{top: pos.top, left: pos.left}}
    >
      <p className="text-sm text-[var(--color-foreground)] leading-relaxed">{highlight.note}</p>
      <div className="flex justify-end border-t border-[var(--color-border)] pt-2">
        <button
          onClick={onEdit}
          className="text-xs text-[var(--color-primary)] hover:opacity-80 transition-opacity"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/reader/NoteTooltip.tsx
git commit -m "feat: NoteTooltip floating card for reading highlight notes"
```

---

## Task 8: AnnotationLayer — note dot clicks + NoteTooltip rendering

**Files:**
- Modify: `src/components/reader/AnnotationLayer.tsx`

- [ ] **Step 1: Rewrite AnnotationLayer.tsx**

```tsx
import {useEffect, useRef, useState} from 'react';
import {getHighlightsForPage, getTags, getHighlights} from '@/lib/storage';
import {applyHighlightsToDOM} from '@/lib/highlights';
import {BubbleToolbar} from './BubbleToolbar';
import {NotePanel} from './NotePanel';
import {NoteTooltip} from './NoteTooltip';
import {useAnnotationStore} from '@/store/annotationStore';

interface AnnotationLayerProps {
  pageUrl: string;
  topicId?: string;
}

export function AnnotationLayer({pageUrl, topicId}: AnnotationLayerProps) {
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [markRect, setMarkRect] = useState<DOMRect | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteDotRect, setNoteDotRect] = useState<DOMRect | null>(null);
  const appliedRef = useRef(false);
  const showAnnotations = useAnnotationStore((s) => s.showAnnotations);

  // Apply highlights to DOM after content renders
  useEffect(() => {
    appliedRef.current = false;
    const tags = getTags();

    const tryApply = () => {
      const container = document.querySelector('article.prose') as HTMLElement | null;
      if (!container) return false;

      container.querySelectorAll('mark[data-highlight-id]').forEach((mark) => {
        const parent = mark.parentNode;
        while (mark.firstChild) parent?.insertBefore(mark.firstChild, mark);
        parent?.removeChild(mark);
        parent?.normalize();
      });
      container.querySelectorAll('span.handbook-note-dot').forEach((dot) => dot.remove());

      if (showAnnotations) {
        const highlights = getHighlightsForPage(pageUrl);
        if (highlights.length > 0) applyHighlightsToDOM(highlights, container, tags);
      }
      appliedRef.current = true;
      return true;
    };

    if (tryApply()) return;

    const interval = setInterval(() => {
      if (tryApply()) clearInterval(interval);
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      tryApply();
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pageUrl, showAnnotations]);

  // Click handler: mark clicks → NotePanel; note-dot clicks → NoteTooltip
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const dot = (e.target as HTMLElement).closest(
        'span.handbook-note-dot[data-highlight-id]',
      ) as HTMLElement | null;
      if (dot?.dataset.highlightId) {
        setNoteDotRect(dot.getBoundingClientRect());
        setActiveNoteId(dot.dataset.highlightId);
        setActiveHighlightId(null);
        return;
      }

      const mark = (e.target as HTMLElement).closest(
        'mark[data-highlight-id]',
      ) as HTMLElement | null;
      if (mark?.dataset.highlightId) {
        const id = mark.dataset.highlightId;
        setMarkRect(mark.getBoundingClientRect());
        setActiveHighlightId(id);
        setActiveNoteId(null);

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
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function reapplyHighlights() {
    const tags = getTags();
    const container = document.querySelector('article.prose') as HTMLElement | null;
    if (container) {
      container.querySelectorAll('span.handbook-note-dot').forEach((dot) => dot.remove());
      const highlights = getHighlightsForPage(pageUrl);
      applyHighlightsToDOM(highlights, container, tags);
    }
  }

  return (
    <>
      <BubbleToolbar
        pageUrl={pageUrl}
        topicId={topicId}
        onHighlightCreated={reapplyHighlights}
      />
      {activeHighlightId && (
        <NotePanel
          highlightId={activeHighlightId}
          anchorRect={markRect}
          tags={getTags()}
          onClose={() => setActiveHighlightId(null)}
          onDelete={(id) => {
            const mark = document.querySelector(`mark[data-highlight-id="${id}"]`);
            if (mark) {
              const parent = mark.parentNode;
              while (mark.firstChild) parent?.insertBefore(mark.firstChild, mark);
              parent?.removeChild(mark);
              parent?.normalize();
            }
            const dot = document.querySelector(`span.handbook-note-dot[data-highlight-id="${id}"]`);
            dot?.remove();
            setActiveHighlightId(null);
          }}
        />
      )}
      {activeNoteId && noteDotRect && (
        <NoteTooltip
          highlightId={activeNoteId}
          anchorRect={noteDotRect}
          onClose={() => setActiveNoteId(null)}
          onEdit={() => {
            const mark = document.querySelector(
              `mark[data-highlight-id="${activeNoteId}"]`,
            ) as HTMLElement | null;
            setMarkRect(mark?.getBoundingClientRect() ?? noteDotRect);
            setActiveHighlightId(activeNoteId);
            setActiveNoteId(null);
          }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/reader/AnnotationLayer.tsx
git commit -m "feat: AnnotationLayer — note-dot click handler + NoteTooltip rendering"
```

---

## Task 9: BubbleToolbar (replaces HighlightPopover)

**Files:**
- Create: `src/components/reader/BubbleToolbar.tsx`
- Delete: `src/components/reader/HighlightPopover.tsx`

Note: `AnnotationLayer.tsx` already imports `BubbleToolbar` from Task 8 — create it now to resolve the import.

- [ ] **Step 1: Create BubbleToolbar.tsx**

```tsx
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {type Tag, getTags, getHighlightsForPage} from '@/lib/storage';
import {
  createHighlight,
  buildAnchorContext,
  getHighlightColorForTags,
  applyHighlightsToDOM,
} from '@/lib/highlights';
import {clampToViewport} from '@/lib/positioning';
import {useDelayedUnmount} from '@/lib/useDelayedUnmount';
import {useMapStore} from '@/store/mapStore';
import {useAnnotationStore} from '@/store/annotationStore';
import {Zap, MapPin, ChevronDown} from 'lucide-react';

interface BubbleToolbarProps {
  pageUrl: string;
  onHighlightCreated: () => void;
  topicId?: string;
}

export function BubbleToolbar({pageUrl, onHighlightCreated, topicId = ''}: BubbleToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [pos, setPos] = useState({top: -9999, left: -9999});
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const toolbarRef = useRef<HTMLDivElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addAnnotation = useAnnotationStore((s) => s.addAnnotation);
  const addNode = useMapStore((s) => s.addNode);
  const shouldRender = useDelayedUnmount(visible, 100);

  useEffect(() => {
    setTags(getTags());

    function onSelectionChange() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        // Don't hide if focus is inside our toolbar (e.g. note input is focused)
        if (toolbarRef.current?.contains(document.activeElement)) return;

        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
          setVisible(false);
          return;
        }
        const text = sel.toString().trim();
        if (text.length < 3) {
          setVisible(false);
          return;
        }
        const anchor = sel.anchorNode;
        const el =
          anchor?.nodeType === Node.TEXT_NODE
            ? (anchor as Text).parentElement
            : (anchor as Element);
        if (!el?.closest('article.prose')) {
          setVisible(false);
          return;
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSavedRange(range.cloneRange());
        setSelectedText(text);
        setSelectionRect(rect);
        setSelectedTagId(null);
        setShowTagMenu(false);
        setShowNoteInput(false);
        setNoteText('');
        setVisible(true);
      }, 80);
    }

    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (!visible || !selectionRect || !toolbarRef.current) return;
    const {offsetWidth, offsetHeight} = toolbarRef.current;
    const result = clampToViewport({
      anchorRect: selectionRect,
      popoverWidth: offsetWidth,
      popoverHeight: offsetHeight,
      preferredPlacement: 'above',
      margin: 8,
    });
    setPos({top: result.top, left: result.left});
  }, [visible, selectionRect, showNoteInput, showTagMenu]);

  useEffect(() => {
    if (showNoteInput) noteInputRef.current?.focus();
  }, [showNoteInput]);

  const doHighlight = useCallback(
    (note = '') => {
      if (!savedRange || !selectedText) return;
      const tagIds = selectedTagId ? [selectedTagId] : [];
      createHighlight({
        pageUrl,
        selectedText,
        tagIds,
        note,
        connectionUrl: '',
        anchorContext: buildAnchorContext(savedRange),
        charOffsetStart: 0,
        charOffsetEnd: 0,
      });
      const container = document.querySelector('article.prose') as HTMLElement | null;
      if (container) {
        const allTags = getTags();
        const highlights = getHighlightsForPage(pageUrl);
        applyHighlightsToDOM(highlights, container, allTags);
      }
      window.getSelection()?.removeAllRanges();
      setVisible(false);
      onHighlightCreated();
    },
    [savedRange, selectedText, selectedTagId, pageUrl, onHighlightCreated],
  );

  useEffect(() => {
    if (!visible) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showNoteInput) {
          setShowNoteInput(false);
          setNoteText('');
        } else {
          setVisible(false);
        }
        return;
      }
      if (e.key === 'Enter' && !showNoteInput) {
        e.preventDefault();
        doHighlight();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visible, showNoteInput, doHighlight]);

  function handleCapture() {
    if (!topicId || !selectedText) return;
    const annotationId = addAnnotation({
      docId: pageUrl,
      position: {start: 0, end: 0},
      type: 'quick-capture',
      text: selectedText,
    });
    addNode(topicId, {
      label: selectedText.slice(0, 60),
      type: 'concept',
      status: 'staged',
      annotationId,
    });
    window.getSelection()?.removeAllRanges();
    setVisible(false);
  }

  function handleAddNode() {
    if (!topicId || !selectedText) return;
    const annotationId = addAnnotation({
      docId: pageUrl,
      position: {start: 0, end: 0},
      type: 'highlight',
      text: selectedText,
    });
    const nodeId = addNode(topicId, {
      label: selectedText.slice(0, 60),
      type: 'concept',
      status: 'placed',
      position: {x: 200, y: 200},
      annotationId,
    });
    useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId});
    window.getSelection()?.removeAllRanges();
    setVisible(false);
    onHighlightCreated();
  }

  const {bg: previewBg} = getHighlightColorForTags(
    selectedTagId ? [selectedTagId] : [],
    tags,
  );
  const isExiting = !visible && shouldRender;

  if (!shouldRender) return null;

  return (
    <div
      ref={toolbarRef}
      role="dialog"
      aria-label="Text actions"
      data-highlight-popover="true"
      className={[
        'fixed z-50 rounded-xl border bg-[var(--color-card)] shadow-xl overflow-hidden',
        'transition-all duration-100',
        isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100',
      ].join(' ')}
      style={{top: pos.top, left: pos.left}}
      // Prevent mousedown from collapsing the selection before button clicks fire
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault();
      }}
    >
      {/* Main action row */}
      <div className="flex items-center gap-0 px-1 py-1">
        {/* Tag picker button */}
        <button
          onClick={() => setShowTagMenu((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-muted)] text-xs text-[var(--color-foreground)] transition-colors"
          title="Choose tag"
        >
          <span
            className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
            style={{background: previewBg}}
          />
          <ChevronDown size={10} className="text-[var(--color-muted-foreground)]" />
        </button>

        <div className="w-px h-5 bg-[var(--color-border)] mx-0.5" />

        {/* Highlight */}
        <button
          onClick={() => doHighlight()}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-muted)] text-xs font-medium text-[var(--color-foreground)] transition-colors"
          title="Highlight (Enter)"
        >
          Highlight
        </button>

        {/* Note */}
        <button
          onClick={() => setShowNoteInput((v) => !v)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-muted)] text-xs text-[var(--color-foreground)] transition-colors"
          title="Add note"
        >
          Note
        </button>

        {topicId && (
          <>
            <div className="w-px h-5 bg-[var(--color-border)] mx-0.5" />
            <button
              onClick={handleCapture}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-muted)] text-xs text-[var(--color-foreground)] transition-colors"
              title="Quick capture"
            >
              <Zap size={11} />
            </button>
            <button
              onClick={handleAddNode}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-muted)] text-xs text-[var(--color-foreground)] transition-colors"
              title="Add as map node"
            >
              <MapPin size={11} />
            </button>
          </>
        )}
      </div>

      {/* Tag dropdown */}
      {showTagMenu && (
        <div className="border-t border-[var(--color-border)] px-2 py-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => {
                setSelectedTagId(selectedTagId === tag.id ? null : tag.id);
                setShowTagMenu(false);
              }}
              className={[
                'flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors',
                selectedTagId === tag.id
                  ? 'border-transparent text-[var(--color-foreground)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              ].join(' ')}
              style={
                selectedTagId === tag.id
                  ? {background: tag.color + '40', borderColor: tag.color}
                  : {}
              }
            >
              <span className="w-2 h-2 rounded-full" style={{background: tag.color}} />
              {tag.name}
            </button>
          ))}
          {tags.length === 0 && (
            <span className="text-xs text-[var(--color-muted-foreground)]">No tags yet</span>
          )}
        </div>
      )}

      {/* Note input */}
      {showNoteInput && (
        <div className="border-t border-[var(--color-border)] px-2 py-2 flex gap-2">
          <input
            ref={noteInputRef}
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                doHighlight(noteText);
              }
              if (e.key === 'Escape') {
                e.stopPropagation();
                setShowNoteInput(false);
                setNoteText('');
              }
            }}
            placeholder="Add a note… (Enter to save)"
            className="flex-1 text-xs bg-[var(--color-muted)] rounded px-2 py-1.5 outline-none text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Delete HighlightPopover.tsx**

```bash
rm src/components/reader/HighlightPopover.tsx
```

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: PASS — all tests. If any test references `HighlightPopover`, it can be deleted since the component is gone.

- [ ] **Step 4: Manual verification**

Run `npm run dev`. In annotation mode, select 3+ characters within a doc. Confirm:
1. The bubble toolbar appears centred above the selection.
2. Pressing Enter applies the highlight immediately.
3. Clicking "Note" expands the input; Enter in the input saves highlight + note; the note dot appears.
4. Escape collapses the note input back; Escape again dismisses the toolbar.
5. Tag dropdown opens; selecting a tag updates the colour preview and applies to the highlight.

- [ ] **Step 5: Commit**

```bash
git add src/components/reader/BubbleToolbar.tsx
git commit -m "feat: BubbleToolbar — Notion-style annotation toolbar with selectionchange trigger"
```

---

## Task 10: DocsPage — panel flip + DocNav

**Files:**
- Modify: `src/pages/DocsPage.tsx`

- [ ] **Step 1: Update DocsPage.tsx**

Find the `return` statement inside `DocsPage`. Swap the `left` and `right` props, and add `<DocNav>` at the bottom of the reader:

```tsx
import {DocNav} from '@/components/reader/DocNav';

// ... (keep all existing imports and logic unchanged above the return)

  return (
    <WorkspaceLayout
      left={
        <div id="docs-content" className="h-full overflow-y-auto">
          <ProgressBar pageUrl={pathname} />
          <div className="flex justify-end px-4 pt-2">
            <AnnotationToggle />
          </div>
          <div className="max-w-3xl mx-auto px-6 py-4">
            <MDXProvider components={MDX_COMPONENTS}>
              <article className="prose">
                <Suspense fallback={<div className="text-[var(--color-muted-foreground)] text-sm">Loading…</div>}>
                  <Content />
                </Suspense>
              </article>
            </MDXProvider>
          </div>
          <DocNav currentPath={pathname} />
          <AnnotationLayer pageUrl={pathname} topicId={topicId} />
        </div>
      }
      right={
        <div className="relative h-full">
          <MapCanvas topicId={topicId} onNodeClick={handleMapNodeClick} />
          <StagingInbox topicId={topicId} />
        </div>
      }
    />
  );
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: PASS — all tests.

- [ ] **Step 3: Manual verification**

Run `npm run dev`. Confirm:
1. Reader panel is on the left, map panel is on the right.
2. Prev/next navigation links appear at the bottom of each doc.
3. Navigating between docs using the nav links works correctly.
4. Navigating to Highlights page and back preserves the workspace layout (split percent, mode).

- [ ] **Step 4: Commit**

```bash
git add src/pages/DocsPage.tsx
git commit -m "feat: reader left, map right; add DocNav to reader bottom"
```

---

## Self-Review Checklist

After writing this plan, cross-checking against the spec:

| Spec requirement | Task |
|-----------------|------|
| remark-frontmatter strips YAML frontmatter | Task 1 |
| Bubble toolbar with selectionchange trigger | Task 9 |
| Toolbar: Tag, Highlight (Enter), Note, Capture, Node | Task 9 |
| Note input expands; Enter saves; Escape collapses | Task 9 |
| workspaceStore Zustand persist | Task 2 |
| WorkspaceLayout reads from store | Task 3 |
| Panel flip (reader left, map right) | Task 10 |
| Updated button labels | Task 3 |
| Collapsible sidebar with toggle | Task 4 |
| `mark.handbook-highlight` CSS cursor + border-radius | Task 6 |
| Note dot injected after mark when note is set | Task 6 |
| NoteTooltip floating card | Task 7 |
| AnnotationLayer: note-dot click → NoteTooltip | Task 8 |
| NoteTooltip Edit → opens NotePanel | Task 8 |
| DocNav prev/next from manifest | Task 5 |
| DocNav added to reader in DocsPage | Task 10 |
| connect-to-node deferred | Not implemented (per spec) |
