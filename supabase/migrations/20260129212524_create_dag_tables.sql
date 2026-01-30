-- DAG lookup tables for Airflow

create table player_canon (
  player_id text primary key,
  canonical_name text not null,
  aliases text[] default '{}',
  competition_names text[] default '{}',
  teams text[] default '{}'
);

create table event_canon (
  phrase text not null,
  event_type text not null,
  event_subtype text,
  primary key (phrase, event_type)
);

create table intent_templates (
  intent text primary key,
  visualization_type text not null,
  example_phrases text[] default '{}'
);
