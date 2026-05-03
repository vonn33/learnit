import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { DocRow } from '@/lib/supabase';

export type Doc = DocRow;

export type NewDoc = Omit<Doc, 'id' | 'created_at' | 'updated_at' | 'user_id'>;

interface DocStore {
  docs: Doc[];
  loading: boolean;
  error: string | null;
  activeContent: { slug: string; content_md: string } | null;

  fetchAll: () => Promise<void>;
  fetchContent: (slug: string) => Promise<Doc | null>;
  createDoc: (input: NewDoc) => Promise<Doc>;
  updateDoc: (id: string, patch: Partial<Doc>) => Promise<void>;
  deleteDoc: (id: string, mode: 'cascade' | 'retain') => Promise<void>;
  subscribeRealtime: () => () => void;
  reset: () => void;
}

export const useDocStore = create<DocStore>((set, get) => ({
  docs: [],
  loading: false,
  error: null,
  activeContent: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('docs')
      .select('id, title, slug, project, section, abstract, toc_json, word_count, user_id, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    set({
      docs: (data ?? []).map((d) => ({ ...d, content_md: '' })) as Doc[],
      loading: false,
    });
  },
  fetchContent: async (slug) => {
    const { data, error } = await supabase
      .from('docs')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error || !data) {
      set({ error: error?.message ?? 'Doc not found' });
      return null;
    }
    set({ activeContent: { slug, content_md: data.content_md } });
    return data as Doc;
  },
  createDoc: async (input) => {
    const { data, error } = await supabase
      .from('docs')
      .insert(input)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'createDoc failed');
    set((s) => ({ docs: [data as Doc, ...s.docs] }));
    return data as Doc;
  },
  updateDoc: async (id, patch) => {
    const { error } = await supabase.from('docs').update(patch).eq('id', id);
    if (error) {
      set({ error: error.message });
      return;
    }
    set((s) => ({
      docs: s.docs.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));
  },

  deleteDoc: async (id, mode) => {
    if (mode === 'cascade') {
      await supabase.from('annotations').delete().eq('doc_id', id);
    } else {
      await supabase.from('annotations').update({ doc_id: null }).eq('doc_id', id);
    }
    const { error } = await supabase.from('docs').delete().eq('id', id);
    if (error) {
      set({ error: error.message });
      return;
    }
    set((s) => ({ docs: s.docs.filter((d) => d.id !== id) }));
  },
  subscribeRealtime: () => () => {},
  reset: () => {
    set({ docs: [], loading: false, error: null, activeContent: null });
  },
}));
