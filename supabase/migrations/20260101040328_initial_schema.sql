create extension if not exists "uuid-ossp" with schema extensions;

create table competitions (
  id uuid primary key default uuid_generate_v4(),
  competition_id integer unique not null,
  competition_name text not null,
  season_name text not null,
  created_at timestamp with time zone default now()
);
create index idx_competitions_id on competitions(competition_id);

create table matches (
  id uuid primary key default uuid_generate_v4(),
  match_id integer unique not null,
  competition_id integer not null,
  season_name text not null,
  match_date date not null,
  kickoff_time timestamp with time zone,

  home_team_id integer not null,
  home_team_name text not null,
  away_team_id integer not null,
  away_team_name text not null,
  
  home_team_score integer not null default 0,
  away_team_score integer not null default 0,

  stadium_name text,
  referee_name text,

  match_status text default 'not_started',
  last_updated timestamp with time zone not null,
  created_at timestamp with time zone default now()
);
create index idx_matches_id on matches(match_id);
create index idx_matches_competition on matches(competition_id);
create index idx_matches_date on matches(match_date);
create index idx_matches_teams on matches(home_team_id, away_team_id);

create table players (
  id uuid primary key default uuid_generate_v4(),
  player_id integer unique not null,
  player_name text not null,
  player_nickname text not null,
  player_age integer not null,
  player_position text not null,
  jersey_number integer not null,
  country text,
  created_at timestamp with time zone default now()
);
create index idx_players_id on players(player_id);
create index idx_players_name on players(player_name);
create index idx_players_jersey_number on players(jersey_number);

create table lineups (
  id uuid primary key default uuid_generate_v4(),
  match_id integer references matches(match_id) on delete cascade,
  player_id integer references players(player_id),
  team_id integer not null,
  team_name text not null,
  
  position_name text not null,
  jersey_number integer not null,

  created_at timestamp with time zone default now(),
  unique (match_id, player_id, team_id)
);
create index idx_lineups_id on lineups(match_id);
create index idx_lineups_player on lineups(player_id);
create index idx_lineups_team on lineups(team_id);

create table events (
  id uuid primary key default uuid_generate_v4(),
  event_id text not null,
  match_id integer references matches(match_id) on delete cascade,

  -- timing information
  period integer not null,
  minute integer not null,
  second integer not null,
  timestamp time not null,

  -- event information
  event_type text not null,
  event_type_id integer not null,

  -- player information
  player_id integer references players(player_id),
  player_name text,
  team_id integer not null,
  team_name text not null,
  possession_team_id integer,
  possession_team_name text,

  -- position
  location_x real,
  location_y real,

  -- for passes, shots, carries
  end_location_x real,
  end_location_y real,

  -- Outcome
  outcome_name text,

  -- Full event data (JSONB)
  event_data jsonb not null,

  created_at timestamp with time zone default now(),

  unique (event_id, match_id)
);
create index idx_events_id on events(event_id);
create index idx_events_type on events(event_type);
create index idx_events_player on events(player_id);
create index idx_events_team on events(team_id);
create index idx_events_timing on events(match_id, period, minute);
create index idx_events_location on events(location_x, location_y);

create index idx_events_data_gin on events using gin (event_data);

create index idx_events_player_type on events(player_name, event_type);
create index idx_events_team_type on events(team_name, event_type);


-- views
create view passes as
select
  e.id,
  e.match_id,
  e.period,
  e.minute,
  e.second,
  e.team_name,
  e.location_x,
  e.location_y,
  e.end_location_x,
  e.end_location_y,
  e.outcome_name,
  e.player_id,
  e.player_name,
  e.event_data -> 'pass' ->> 'recipient' as recipient_name,
  e.event_data -> 'pass' ->> 'length' as pass_length,
  e.event_data -> 'pass' ->> 'height' as pass_height,
  m.home_team_name,
  m.away_team_name,
  m.match_date
from events e
join matches m on e.match_id = m.match_id
where e.event_type = 'Pass';

create view shots as
select
  e.id,
  e.match_id,
  e.minute,
  e.team_name,
  e.location_x,
  e.location_y,
  e.end_location_x,
  e.end_location_y,
  e.outcome_name,
  e.player_id,
  e.player_name,
  e.event_data -> 'shot' ->> 'body_part' as body_part,
  e.event_data -> 'shot' ->> 'statsbomb_xg' as xg,
  m.match_date
from events e
join matches m on e.match_id = m.match_id
where e.event_type = 'Shot';

-- function: Get events in a specific zone (for heatmap)
create function get_events_in_zone(p_match_id integer, p_zone text)
returns table (
  event_id text,
  event_type text,
  player_name text,
  location_x real,
  location_y real
) as $$
begin
  return query select
    e.event_id,
    e.event_type,
    e.player_name,
    e.location_x,
    e.location_y
  from events e
  where e.match_id = p_match_id
    and case p_zone when 'defense_third' then
      e.location_x between 0 and 40
    when 'middle_third' then
      e.location_x between 40 and 80
    when 'final_third' then
      e.location_x between 80 and 120
    end;
end;
$$ language plpgsql;

create function get_pass_completion_rate(
  p_player_name text,
  p_match_id integer default null
)
returns table (
  player_name text,
  total_passes bigint,
  completed_passes bigint,
  completion_rate numeric
) as $$
begin
  return query select
    e.player_name,
    count(*) as total_passes,
    count(*) filter (where e.outcome_name is null or e.outcome_name = 'Complete') as completed_passes,
    ROUND(
      (count(*) filter (where e.outcome_name is null or e.outcome_name = 'Complete')::numeric / count(*)::numeric /count(*)::numeric *100), 2
    ) as completion_rate
  from events e
  where e.event_type = 'Pass'
    and (p_match_id is null or e.match_id = p_match_id)
    and p_player_name = p_player_name
  group by e.player_name;
end;
$$ language plpgsql;