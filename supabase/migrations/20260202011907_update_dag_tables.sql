drop table if exists player_canon;
drop table if exists event_canon;
drop table if exists intent_templates;

-- Table for player name aliases
CREATE TABLE IF NOT EXISTS player_aliases (
  id SERIAL PRIMARY KEY,
  canonical_name VARCHAR(255) NOT NULL,
  alias VARCHAR(255) NOT NULL,
  confidence FLOAT DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(canonical_name, alias)
);

CREATE INDEX idx_player_alias ON player_aliases(alias);
CREATE INDEX idx_player_canonical ON player_aliases(canonical_name);

-- Table for pitch zones
CREATE TABLE IF NOT EXISTS pitch_zones (
  id SERIAL PRIMARY KEY,
  zone_name VARCHAR(50) UNIQUE NOT NULL,
  coordinates JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_zone_name ON pitch_zones(zone_name);

-- Table for event type synonyms
CREATE TABLE IF NOT EXISTS event_synonyms (
  id SERIAL PRIMARY KEY,
  canonical_type VARCHAR(100) NOT NULL,
  synonym VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(canonical_type, synonym)
);

CREATE INDEX idx_event_synonym ON event_synonyms(synonym);

-- Insert sample data (zones won't change often)
INSERT INTO pitch_zones (zone_name, coordinates) VALUES
  ('defensive_third', '{"x_min": 0, "x_max": 40}'),
  ('middle_third', '{"x_min": 40, "x_max": 80}'),
  ('final_third', '{"x_min": 80, "x_max": 120}'),
  ('left_wing', '{"y_min": 0, "y_max": 26}'),
  ('center', '{"y_min": 27, "y_max": 53}'),
  ('right_wing', '{"y_min": 54, "y_max": 80}'),
  ('penalty_box', '{"x_min": 102, "x_max": 120, "y_min": 18, "y_max": 62}'),
  ('six_yard_box', '{"x_min": 114, "x_max": 120, "y_min": 30, "y_max": 50}')
ON CONFLICT (zone_name) DO NOTHING;

-- Insert sample event synonyms
INSERT INTO event_synonyms (canonical_type, synonym) VALUES
  ('Pass', 'pass'),
  ('Pass', 'passing'),
  ('Pass', 'distribution'),
  ('Pass', 'ball distribution'),
  ('Shot', 'shot'),
  ('Shot', 'shooting'),
  ('Shot', 'attempt'),
  ('Shot', 'strike'),
  ('Dribble', 'dribble'),
  ('Dribble', 'take-on'),
  ('Carry', 'carry'),
  ('Carry', 'run with ball'),
  ('Pressure', 'pressure'),
  ('Pressure', 'press'),
  ('Pressure', 'harass'),
  ('Interception', 'interception'),
  ('Interception', 'cut off pass'),
  ('Interception', 'break up play'),
  ('Tackle', 'tackle'),
  ('Tackle', 'dispossess'),
  ('Tackle', 'win ball'),
  ('Clearance', 'clearance'),
  ('Clearance', 'clearances'),
  ('Clearance', 'cleared'),
  ('Clearance', 'kick out')
ON CONFLICT DO NOTHING;