/**
 * localStorage helpers — all data keyed under 'handbook:*' namespace.
 */

export type Tag = {
  id: string;
  name: string;
  color: string; // hex or any CSS colour value
};

export type Highlight = {
  id: string;
  pageUrl: string;
  selectedText: string;
  tagIds: string[];
  note: string;
  connectionUrl: string;
  anchorContext: string; // 30-char prefix + selectedText + 30-char suffix
  charOffsetStart: number;
  charOffsetEnd: number;
  createdAt: string; // ISO
};

export type DiagramLayouts = {
  [pageId: string]: {
    nodes: Array<{id: string; position: {x: number; y: number}; data: {label: string}; type?: string}>;
    edges: Array<{id: string; source: string; target: string; label?: string}>;
  };
};

export type ReadingProgress = {
  [pageUrl: string]: {scrollFraction: number; lastVisited: string};
};

export type UserDiagram = {
  id: string;
  title: string;
  preset: string;
  nodes: Array<{id: string; position: {x: number; y: number}; data: {label: string}; type?: string}>;
  edges: Array<{id: string; source: string; target: string; label?: string}>;
  createdAt: string;
  updatedAt: string;
};

export type HandbookData = {
  highlights: Highlight[];
  tags: Tag[];
  diagramLayouts: DiagramLayouts;
  readingProgress: ReadingProgress;
};

const KEYS = {
  highlights: 'handbook:highlights',
  tags: 'handbook:tags',
  diagramLayouts: 'handbook:diagram-layouts',
  readingProgress: 'handbook:reading-progress',
  userDiagrams: 'handbook:user-diagrams',
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded — silent fail
  }
}

// ── Highlights ──

export function getHighlights(): Highlight[] {
  return read<Highlight[]>(KEYS.highlights, []);
}

export function saveHighlights(highlights: Highlight[]): void {
  write(KEYS.highlights, highlights);
}

export function getHighlightsForPage(pageUrl: string): Highlight[] {
  return getHighlights().filter((h) => h.pageUrl === pageUrl);
}

// ── Tags ──

const DEFAULT_TAGS: Tag[] = [
  {id: 'default-key-point', name: 'Key point', color: '#facc15'},
];

export function getTags(): Tag[] {
  const stored = read<Tag[]>(KEYS.tags, []);
  return stored.length > 0 ? stored : DEFAULT_TAGS;
}

export function saveTags(tags: Tag[]): void {
  write(KEYS.tags, tags);
}

// ── Diagram layouts ──

export function getDiagramLayouts(): DiagramLayouts {
  return read<DiagramLayouts>(KEYS.diagramLayouts, {});
}

export function saveDiagramLayout(
  pageId: string,
  layout: DiagramLayouts[string],
): void {
  const all = getDiagramLayouts();
  all[pageId] = layout;
  write(KEYS.diagramLayouts, all);
}

export function getDiagramLayout(pageId: string): DiagramLayouts[string] | null {
  return getDiagramLayouts()[pageId] ?? null;
}

// ── Reading progress ──

export function getReadingProgress(): ReadingProgress {
  return read<ReadingProgress>(KEYS.readingProgress, {});
}

export function saveReadingProgress(pageUrl: string, scrollFraction: number): void {
  const all = getReadingProgress();
  all[pageUrl] = {scrollFraction, lastVisited: new Date().toISOString()};
  write(KEYS.readingProgress, all);
}

// ── User Diagrams ──

export function getUserDiagrams(): UserDiagram[] {
  return read<UserDiagram[]>(KEYS.userDiagrams, []);
}

export function saveUserDiagrams(diagrams: UserDiagram[]): void {
  write(KEYS.userDiagrams, diagrams);
}

export function getUserDiagram(id: string): UserDiagram | null {
  return getUserDiagrams().find((d) => d.id === id) ?? null;
}

export function upsertUserDiagram(diagram: UserDiagram): void {
  const all = getUserDiagrams();
  const idx = all.findIndex((d) => d.id === diagram.id);
  if (idx >= 0) {
    all[idx] = diagram;
  } else {
    all.push(diagram);
  }
  saveUserDiagrams(all);
}

export function deleteUserDiagram(id: string): void {
  saveUserDiagrams(getUserDiagrams().filter((d) => d.id !== id));
}
