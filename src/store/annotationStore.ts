import { create } from 'zustand';
import { supabase, type AnnotationRow } from '@/lib/supabase';

export interface Annotation {
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
}

type NewAnnotation = Omit<Annotation, 'id' | 'createdAt'>;
type AnnotationUpdate = Partial<Pick<
  Annotation,
  'note' | 'mapNodeId' | 'tagIds' | 'type' | 'connectionUrl'
>>;

interface AnnotationStore {
  annotations: Annotation[];
  showAnnotations: boolean;

  fetchAll: () => Promise<void>;
  addAnnotation: (a: NewAnnotation) => Promise<string>;
  updateAnnotation: (id: string, patch: AnnotationUpdate) => Promise<void>;
  removeAnnotation: (id: string) => Promise<void>;
  getAnnotationsForDoc: (docId: string) => Annotation[];
  toggleAnnotations: () => void;
  subscribeRealtime: () => () => void;
  reset: () => void;
}

function rowToAnnotation(row: AnnotationRow): Annotation {
  return {
    id: row.id,
    docId: row.doc_id ?? '',
    type: row.type,
    text: row.text,
    anchorContext: row.anchor_context,
    tagIds: row.tag_ids,
    note: row.note,
    connectionUrl: row.connection_url,
    mapNodeId: row.map_node_id ?? undefined,
    createdAt: row.created_at,
  };
}

function annotationToRow(a: NewAnnotation): Omit<AnnotationRow, 'id' | 'created_at' | 'user_id'> {
  return {
    doc_id: a.docId || null,
    type: a.type,
    text: a.text,
    anchor_context: a.anchorContext,
    tag_ids: a.tagIds,
    note: a.note,
    connection_url: a.connectionUrl,
    map_node_id: a.mapNodeId ?? null,
  };
}

export const useAnnotationStore = create<AnnotationStore>((set, get) => ({
  annotations: [],
  showAnnotations: true,

  fetchAll: async () => {
    const { data, error } = await supabase
      .from('annotations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return;
    set({ annotations: data.map(rowToAnnotation) });
  },

  addAnnotation: async (a) => {
    const row = annotationToRow(a);
    const { data, error } = await supabase
      .from('annotations')
      .insert(row)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'addAnnotation failed');
    const annotation = rowToAnnotation(data as AnnotationRow);
    set((s) =>
      s.annotations.find((x) => x.id === annotation.id)
        ? s
        : { annotations: [...s.annotations, annotation] },
    );
    return annotation.id;
  },

  updateAnnotation: async (id, patch) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.note !== undefined) dbPatch.note = patch.note;
    if (patch.tagIds !== undefined) dbPatch.tag_ids = patch.tagIds;
    if (patch.type !== undefined) dbPatch.type = patch.type;
    if (patch.connectionUrl !== undefined) dbPatch.connection_url = patch.connectionUrl;
    if (patch.mapNodeId !== undefined) dbPatch.map_node_id = patch.mapNodeId ?? null;
    const { error } = await supabase.from('annotations').update(dbPatch).eq('id', id);
    if (error) return;
    set((s) => ({
      annotations: s.annotations.map((a) =>
        a.id === id ? { ...a, ...patch } : a,
      ),
    }));
  },

  removeAnnotation: async (id) => {
    const { error } = await supabase.from('annotations').delete().eq('id', id);
    if (error) return;
    set((s) => ({ annotations: s.annotations.filter((a) => a.id !== id) }));
  },

  getAnnotationsForDoc: (docId) =>
    get().annotations.filter((a) => a.docId === docId),

  toggleAnnotations: () => {
    set((s) => ({ showAnnotations: !s.showAnnotations }));
  },

  subscribeRealtime: () => {
    const channel = supabase
      .channel('annotations-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'annotations' }, (p) => {
        const a = rowToAnnotation(p.new as AnnotationRow);
        set((s) => (s.annotations.find((x) => x.id === a.id) ? s : { annotations: [...s.annotations, a] }));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'annotations' }, (p) => {
        const a = rowToAnnotation(p.new as AnnotationRow);
        set((s) => ({ annotations: s.annotations.map((x) => (x.id === a.id ? a : x)) }));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'annotations' }, (p) => {
        const id = (p.old as { id: string }).id;
        set((s) => ({ annotations: s.annotations.filter((a) => a.id !== id) }));
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  },

  reset: () => set({ annotations: [], showAnnotations: true }),
}));
