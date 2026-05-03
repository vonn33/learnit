-- Enable uuid generation
create extension if not exists "uuid-ossp";

-- docs table
create table docs (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  project text not null,
  section text not null,
  content_md text not null,
  abstract text not null default '',
  toc_json jsonb not null default '[]'::jsonb,
  word_count integer not null default 0,
  user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index docs_project_section_idx on docs (project, section);

-- tags table
create table tags (
  id uuid primary key default uuid_generate_v4(),
  label text not null,
  color text not null default '#64748b',
  user_id uuid,
  created_at timestamptz not null default now()
);

-- annotations table
create table annotations (
  id uuid primary key default uuid_generate_v4(),
  doc_id uuid references docs(id) on delete set null,
  type text not null check (type in ('highlight','note','quick-capture')),
  text text not null default '',
  anchor_context text not null default '',
  tag_ids text[] not null default '{}',
  note text not null default '',
  connection_url text not null default '',
  map_node_id uuid,
  user_id uuid,
  created_at timestamptz not null default now()
);
create index annotations_doc_id_idx on annotations (doc_id);
create index annotations_created_at_idx on annotations (created_at desc);

-- map_nodes table
-- topic_id is text (not uuid) to support project-scoped maps (e.g., "language-learning").
-- Per-doc maps would use the doc id; the schema accepts both.
create table map_nodes (
  id uuid primary key default uuid_generate_v4(),
  topic_id text not null,
  type text not null check (type in ('structural','concept','super-node')),
  status text not null check (status in ('placed','staged')),
  confidence text not null check (confidence in ('uncertain','familiar','mastered')),
  label text not null,
  position_x numeric not null default 0,
  position_y numeric not null default 0,
  source_annotation_id uuid,
  user_id uuid,
  created_at timestamptz not null default now()
);
create index map_nodes_topic_id_idx on map_nodes (topic_id);

-- map_edges table
create table map_edges (
  id uuid primary key default uuid_generate_v4(),
  topic_id text not null,
  source_node_id uuid not null references map_nodes(id) on delete cascade,
  target_node_id uuid not null references map_nodes(id) on delete cascade,
  relationship_type text check (relationship_type in ('causes','supports','contradicts','is-a')),
  label text not null default '',
  note text not null default '',
  user_id uuid,
  created_at timestamptz not null default now()
);
create index map_edges_topic_id_idx on map_edges (topic_id);

-- Enable RLS but make all tables public for V1 (single-user, anon key only)
alter table docs enable row level security;
alter table tags enable row level security;
alter table annotations enable row level security;
alter table map_nodes enable row level security;
alter table map_edges enable row level security;

create policy "public_all" on docs for all using (true) with check (true);
create policy "public_all" on tags for all using (true) with check (true);
create policy "public_all" on annotations for all using (true) with check (true);
create policy "public_all" on map_nodes for all using (true) with check (true);
create policy "public_all" on map_edges for all using (true) with check (true);

-- Enable realtime for sync tables
alter publication supabase_realtime add table docs;
alter publication supabase_realtime add table annotations;
alter publication supabase_realtime add table tags;
alter publication supabase_realtime add table map_nodes;
alter publication supabase_realtime add table map_edges;
