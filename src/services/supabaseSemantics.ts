import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface PlayerAlias {
  canonical_name: string;
  alias: string;
  confidence: number;
}

export interface EventSynonym {
  canonical_type: string;
  synonym: string;
}

export interface PitchZone {
  zone_name: string;
  coordinates: {
    x_min: number;
    x_max: number;
    y_min: number;
    y_max: number;
  };
}

export async function resolvePlayerName(playerName: string): Promise<PlayerAlias> {
  const { data, error } = await supabase
    .from('player_aliases')
    .select('canonical_name')
    .ilike('alias', `%${playerName}%`)
    .single();

  if (error) throw error;
  return data.canonical_name;
}

export async function resolvePlayerNames(playerNames: string[]): Promise<PlayerAlias[]> {
  const res =  await Promise.all(playerNames.map((playerName) => resolvePlayerName(playerName)));
  return res;
}

export async function getZones(zoneName: string): Promise<PitchZone> {
  const { data, error } = await supabase
    .from('pitch_zones')
    .select('coordinates')
    .ilike('zone_name', `%${zoneName}%`)
    .single();

  if (error) throw error;
  return data.coordinates;
}

export async function getEventSynonyms(synonym: string): Promise<EventSynonym[]> {
  const { data, error } = await supabase
    .from('event_synonyms')
    .select('canonical_type')
    .ilike('synonym', `%${synonym}%`)
    .single();

  if (error) throw error;
  return data.canonical_type;
}

export async function getSematicData() {
  const [aliasesCount, zonesCount, eventSynonymsCount] = await Promise.all([
    supabase.from('player_aliases').select('*', {count: 'exact', head: true}),
    supabase.from('pitch_zones').select('*', {count: 'exact', head: true}),
    supabase.from('event_synonyms').select('*', {count: 'exact', head: true}),
  ]);

  return {
    playerAliases: aliasesCount.count || 0,
    zones: zonesCount.count || 0,
    eventSynonyms: eventSynonymsCount.count || 0,
    lastUpdated: new Date().toISOString(),
  };
}