-- Atomic wipe of all user content. Replaces 5 sequential client-side deletes
-- in SettingsPage so a partial failure can't leave the DB half-empty.
--
-- TRUNCATE inside a function runs in a single transaction; if any table fails
-- the whole call rolls back.

create or replace function reset_all_data()
returns void
language plpgsql
security definer
as $$
begin
  truncate table annotations, map_edges, map_nodes, docs, tags restart identity;
end;
$$;

grant execute on function reset_all_data() to anon, authenticated;
