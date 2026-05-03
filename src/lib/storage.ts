/**
 * localStorage helpers — all data keyed under 'handbook:*' namespace.
 */

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
  diagramLayouts: DiagramLayouts;
  readingProgress: ReadingProgress;
};

const KEYS = {
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
