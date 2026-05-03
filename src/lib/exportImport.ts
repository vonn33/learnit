import { useAnnotationStore, type Annotation } from '@/store/annotationStore';
import { supabase, type AnnotationRow, type TagRow } from '@/lib/supabase';

export type ExportData = {
  annotations: Annotation[];
  tags: TagRow[];
};

export function exportData(): ExportData {
  const annotations = useAnnotationStore.getState().annotations;
  // Tags live in Supabase; the annotation store doesn't hold them, so we
  // export whatever tag rows have been fetched into the annotation store's
  // sibling context.  For now we export an empty array — callers that need
  // tags should extend this once a tagStore is introduced.
  return { annotations, tags: [] };
}

export function downloadExport(): void {
  const data = exportData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `learnit-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// `mode` is accepted for backward-compatibility with existing callers but is
// no longer used — Supabase upsert (onConflict: 'id') is always idempotent.
export async function importData(data: unknown, _mode?: 'replace' | 'merge'): Promise<void> {
  const parsed = validateImport(data);

  // 1. Upsert tags
  if (parsed.tags.length > 0) {
    const { error } = await supabase
      .from('tags')
      .upsert(parsed.tags, { onConflict: 'id' });
    if (error) throw new Error(`Tags upsert failed: ${error.message}`);
  }

  // 2. Map camelCase annotation fields → snake_case AnnotationRow, then upsert
  if (parsed.annotations.length > 0) {
    const rows: AnnotationRow[] = parsed.annotations.map((a) => ({
      id: a.id,
      doc_id: a.docId ?? null,
      type: a.type,
      text: a.text,
      anchor_context: a.anchorContext ?? '',
      tag_ids: a.tagIds ?? [],
      note: a.note ?? '',
      connection_url: a.connectionUrl ?? '',
      map_node_id: a.mapNodeId ?? null,
      user_id: null,
      created_at: a.createdAt,
    }));

    const { error } = await supabase
      .from('annotations')
      .upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(`Annotations upsert failed: ${error.message}`);
  }

  // 3. Re-hydrate the in-memory store from Supabase
  await useAnnotationStore.getState().fetchAll();
}

function validateImport(data: unknown): ExportData {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid export format: expected a JSON object');
  }
  const d = data as Record<string, unknown>;
  return {
    annotations: Array.isArray(d.annotations) ? (d.annotations as Annotation[]) : [],
    tags: Array.isArray(d.tags) ? (d.tags as TagRow[]) : [],
  };
}
