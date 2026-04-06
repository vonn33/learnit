import {
  type HandbookData,
  getHighlights,
  getTags,
  getDiagramLayouts,
  getReadingProgress,
  saveHighlights,
  saveTags,
  saveDiagramLayout,
  saveReadingProgress,
  getDiagramLayouts as loadDiagramLayouts,
} from './storage';

export function exportData(): HandbookData {
  return {
    highlights: getHighlights(),
    tags: getTags(),
    diagramLayouts: getDiagramLayouts(),
    readingProgress: getReadingProgress(),
  };
}

export function downloadExport(): void {
  const data = exportData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `handbook-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(
  data: unknown,
  mode: 'replace' | 'merge' = 'replace',
): void {
  const parsed = validateImport(data);

  if (mode === 'replace') {
    saveHighlights(parsed.highlights);
    saveTags(parsed.tags);
    for (const [pageId, layout] of Object.entries(parsed.diagramLayouts)) {
      saveDiagramLayout(pageId, layout);
    }
    for (const [pageUrl, progress] of Object.entries(parsed.readingProgress)) {
      saveReadingProgress(pageUrl, progress.scrollFraction);
    }
  } else {
    // Merge: add items that don't already exist (by id / key)
    const existingHighlightIds = new Set(getHighlights().map((h) => h.id));
    const newHighlights = parsed.highlights.filter(
      (h) => !existingHighlightIds.has(h.id),
    );
    saveHighlights([...getHighlights(), ...newHighlights]);

    const existingTagIds = new Set(getTags().map((t) => t.id));
    const newTags = parsed.tags.filter((t) => !existingTagIds.has(t.id));
    saveTags([...getTags(), ...newTags]);

    const existingLayouts = loadDiagramLayouts();
    for (const [pageId, layout] of Object.entries(parsed.diagramLayouts)) {
      if (!existingLayouts[pageId]) {
        saveDiagramLayout(pageId, layout);
      }
    }
  }
}

function validateImport(data: unknown): HandbookData {
  if (
    typeof data !== 'object' ||
    data === null ||
    !Array.isArray((data as HandbookData).highlights) ||
    !Array.isArray((data as HandbookData).tags)
  ) {
    throw new Error('Invalid handbook data format');
  }
  const d = data as HandbookData;
  return {
    highlights: d.highlights ?? [],
    tags: d.tags ?? [],
    diagramLayouts: d.diagramLayouts ?? {},
    readingProgress: d.readingProgress ?? {},
  };
}
