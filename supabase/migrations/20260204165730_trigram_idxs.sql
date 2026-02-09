create extension if not exists pg_trgm;

create index idx_events_player_name_trgm on events using gin (player_name gin_trgm_ops);

