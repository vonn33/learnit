import {
  type HandbookData,
  getTags,
  getDiagramLayouts,
  getReadingProgress,
  saveTags,
  saveDiagramLayout,
  saveReadingProgress,
} from './storage';
import { useAnnotationStore, type Annotation } from '@/store/annotationStore';
import { useMapStore, type TopicMap } from '@/store/mapStore';

export function exportData(): HandbookData & { annotations: unknown; maps: unknown } {
  return {
    tags: getTags(),
    diagramLayouts: getDiagramLayouts(),
    readingProgress: getReadingProgress(),
    annotations: useAnnotationStore.getState().annotations,
    maps: useMapStore.getState().maps,
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
    saveTags(parsed.tags);
    for (const [pageId, layout] of Object.entries(parsed.diagramLayouts)) {
      saveDiagramLayout(pageId, layout);
    }
    for (const [pageUrl, progress] of Object.entries(parsed.readingProgress)) {
      saveReadingProgress(pageUrl, progress.scrollFraction);
    }
  } else {
    const existingTagIds = new Set(getTags().map((t) => t.id));
    const newTags = parsed.tags.filter((t) => !existingTagIds.has(t.id));
    saveTags([...getTags(), ...newTags]);

    const existingLayouts = getDiagramLayouts();
    for (const [pageId, layout] of Object.entries(parsed.diagramLayouts)) {
      if (!existingLayouts[pageId]) {
        saveDiagramLayout(pageId, layout);
      }
    }
  }

  // Restore annotation store
  const rawData = data as Record<string, unknown>;
  if (rawData.annotations && Array.isArray(rawData.annotations)) {
    if (mode === 'replace') {
      useAnnotationStore.getState().reset();
    }
    useAnnotationStore.setState((s) => ({
      annotations: mode === 'replace'
        ? rawData.annotations as Annotation[]
        : [...s.annotations, ...(rawData.annotations as Annotation[])],
    }));
  }

  // Restore map store
  if (rawData.maps && typeof rawData.maps === 'object') {
    if (mode === 'replace') {
      useMapStore.getState().reset();
    }
    useMapStore.setState((s) => ({
      maps: mode === 'replace'
        ? rawData.maps as Record<string, TopicMap>
        : { ...s.maps, ...(rawData.maps as Record<string, TopicMap>) },
    }));
  }
}

function validateImport(data: unknown): HandbookData {
  if (
    typeof data !== 'object' ||
    data === null ||
    !Array.isArray((data as HandbookData).tags)
  ) {
    throw new Error('Invalid handbook data format');
  }
  const d = data as HandbookData;
  return {
    tags: d.tags ?? [],
    diagramLayouts: d.diagramLayouts ?? {},
    readingProgress: d.readingProgress ?? {},
  };
}
