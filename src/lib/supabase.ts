import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local',
  );
}

export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 5 } },
});

export type DocRow = {
  id: string;
  title: string;
  slug: string;
  project: string;
  section: string;
  content_md: string;
  abstract: string;
  toc_json: TocEntry[];
  word_count: number;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TocEntry = {
  level: number;
  text: string;
  slug: string;
};

export type AnnotationRow = {
  id: string;
  doc_id: string | null;
  type: 'highlight' | 'note' | 'quick-capture';
  text: string;
  anchor_context: string;
  tag_ids: string[];
  note: string;
  connection_url: string;
  map_node_id: string | null;
  user_id: string | null;
  created_at: string;
};

export type TagRow = {
  id: string;
  label: string;
  color: string;
  user_id: string | null;
  created_at: string;
};

export type MapNodeRow = {
  id: string;
  topic_id: string;
  type: 'structural' | 'concept' | 'super-node';
  status: 'placed' | 'staged';
  confidence: 'uncertain' | 'familiar' | 'mastered';
  label: string;
  position_x: number;
  position_y: number;
  source_annotation_id: string | null;
  user_id: string | null;
  created_at: string;
};

export type MapEdgeRow = {
  id: string;
  topic_id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: 'causes' | 'supports' | 'contradicts' | 'is-a' | null;
  label: string;
  note: string;
  user_id: string | null;
  created_at: string;
};
