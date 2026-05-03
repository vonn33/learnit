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
  addTag: async (input) => {
    const { data, error } = await supabase
      .from('tags')
      .insert(tagToRow(input))
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'addTag failed');
    const tag = rowToTag(data as TagRow);
    set((s) =>
      s.tags.find((t) => t.id === tag.id)
        ? s
        : { tags: [...s.tags, tag] },
    );
    return tag;
  },

  updateTag: async (id, patch) => {
    const dbPatch: Partial<Pick<TagRow, 'label' | 'color'>> = {};
    if (patch.name !== undefined) dbPatch.label = patch.name;
    if (patch.color !== undefined) dbPatch.color = patch.color;
    const { error } = await supabase.from('tags').update(dbPatch).eq('id', id);
    if (error) return;
    set((s) => ({
      tags: s.tags.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  },

  removeTag: async (id) => {
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) return;
    set((s) => ({ tags: s.tags.filter((t) => t.id !== id) }));
  },
  subscribeRealtime: () => {
    const channel = supabase
      .channel('tags-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tags' },
        (payload) => {
          const tag = rowToTag(payload.new as TagRow);
          set((s) =>
            s.tags.find((t) => t.id === tag.id)
              ? s
              : { tags: [...s.tags, tag] },
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tags' },
        (payload) => {
          const tag = rowToTag(payload.new as TagRow);
          set((s) => ({
            tags: s.tags.map((t) => (t.id === tag.id ? tag : t)),
          }));
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tags' },
        (payload) => {
          const id = (payload.old as { id: string }).id;
          set((s) => ({ tags: s.tags.filter((t) => t.id !== id) }));
        },
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  },
  reset: () => set({ tags: [] }),
}));
