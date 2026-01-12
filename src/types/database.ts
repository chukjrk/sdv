import type {Database as GeneratedDatabase} from './database.types';

export type Database = GeneratedDatabase;

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];

export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export type Relationships<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Relationships'];

export type Match = Tables<'matches'>;
export type Event = Tables<'events'>;
export type Player = Tables<'players'>;
export type Lineup = Tables<'lineups'>;
export type Competition = Tables<'competitions'>;

export interface EventWithMatch extends Event {
  match: Match;
}

export interface EventWithPlayer extends Event {
  player: Player;
}

export interface PassEvent extends Event {
  event_type: 'Pass'
  end_location_x: number
  end_location_y: number
}

export interface ShotEvent extends Event {
  event_type: 'Shot';
}

export interface PitchCoordinates {
  x: number
  y: number
}

export interface EventForViz {
  id: string
  x: number
  y: number
  end_x?: number
  end_y?: number
  type: string
  player: string
  team: string
  outcome?: string
  minute: number
}