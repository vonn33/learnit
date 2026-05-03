import { create } from 'zustand';
import { supabase, type TagRow } from '@/lib/supabase';

export type Tag = {
  id: string;
  name: string;
  color: string;
};

type NewTag = { name: string; color: string };

interface TagStore {
  tags: Tag[];
  fetchAll: () => Promise<void>;
  addTag: (input: NewTag) => Promise<Tag>;
  updateTag: (id: string, patch: { name?: string; color?: string }) => Promise<void>;
  removeTag: (id: string) => Promise<void>;
  subscribeRealtime: () => () => void;
  reset: () => void;
}

function rowToTag(row: TagRow): Tag {
  return { id: row.id, name: row.label, color: row.color };
}

function tagToRow(t: NewTag): Pick<TagRow, 'label' | 'color'> {
  return { label: t.name, color: t.color };
}

export const useTagStore = create<TagStore>((set) => ({
  tags: [],

  fetchAll: async () => {
    let { data } = await supabase.from('tags').select('*').order('created_at');
    if (data && data.length === 0) {
      await supabase.from('tags').insert({ label: 'Key point', color: '#facc15' });
      ({ data } = await supabase.from('tags').select('*').order('created_at'));
    }
    set({ tags: (data ?? []).map(rowToTag) });
  },
  addTag: async () => { throw new Error('not implemented'); },
  updateTag: async () => {},
  removeTag: async () => {},
  subscribeRealtime: () => () => {},
  reset: () => set({ tags: [] }),
}));
