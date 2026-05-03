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

  fetchAll: async () => {},
  fetchContent: async () => null,
  createDoc: async () => {
    throw new Error('not implemented');
  },
  updateDoc: async () => {},
  deleteDoc: async () => {},
  subscribeRealtime: () => () => {},
  reset: () => {
    set({ docs: [], loading: false, error: null, activeContent: null });
  },
}));
