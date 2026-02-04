import { supabase } from "./supabase";
import type {DataAgentInput, DataAgentOutput, EventFilters} from "@/types/agents";
import type { Event, Match, Player } from "@/types/database";

export async function callDataAgent(input: DataAgentInput): Promise<DataAgentOutput> {
  const startTime = performance.now();

  try {
    console.log('Data Agent - Received input:', input.filters);

    let query = supabase
      .from('events')
      .select('*', { count: 'exact' })
    
    const limit  = input.limit || 1000

    query = applyfilters(query, input.filters);
    query = query.limit(limit);

    query = query
      .order('match_id', { ascending: true })
      .order('period', { ascending: true })
      .order('minute', { ascending: true })
      .order('second', { ascending: true })

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const events = data || [];
    const totalCount = count || 0;
    const executionTime = performance.now() - startTime;

    return { 
      events,
      totalCount, 
      executionTime,
      metadata: { 
        filtersApplied: getAppliedFilters(input.filters),
        limited: (count || 0) > limit
      }
    }
  } catch (error) {
    console.error('Error calling data agent:', error);
    return {
      events: [],
      totalCount: 0,
      executionTime: 0,
      error: (error as Error).message
    } 
  }
}

function applyfilters(query: any, filters: EventFilters): any {
  if (filters.playerNames && filters.playerNames.length > 0) {
    const playerConditions =  filters.playerNames
      .map(name => `player_name.ilike.%${name}%`)
      .join(',');
    query = query.or(playerConditions);
  }
  if (filters.playerIds && filters.playerIds.length > 0) {
    query = query.in('player_id', filters.playerIds);
  }
  if (filters.teamNames && filters.teamNames.length > 0) {
    query = query.in('team_name', filters.teamNames);
  }
  if (filters.teamIds) {
    query = query.in('team_id', filters.teamIds);
  }
  if (filters.eventTypes && filters.eventTypes.length > 0) {
    query = query.in('event_type', filters.eventTypes);
  }
  if (filters.matchId) {
    query = query.eq('match_id', filters.matchId);
  }
  if (filters.matchIds && filters.matchIds.length > 0) {
    query = query.in('match_id', filters.matchIds);
  }

  if (filters.timeRange) {
    query = query
      .gte('minute', filters.timeRange.start)
      .lte('minute', filters.timeRange.end);
  }
  if (filters.period && filters.period.length > 0) {
    query = query.in('period', filters.period);
  }

  if (filters.xRange) {
    query = query
      .gte('location_x', filters.xRange.start)
      .lte('location_x', filters.xRange.end);
  }
  if (filters.yRange) {
    query = query
      .gte('location_y', filters.yRange.start)
      .lte('location_y', filters.yRange.end);
  }
  if (filters.zones && filters.zones.length > 0) {
    const zoneConditions = filters.zones.map(zone => {
      switch (zone) {
        case 'defensive_third':
          return 'location_x.gte.0,location_x.lt.40';
        case 'middle_third':
          return 'location_x.gte.40,location_x.lt.80';
        case 'final_third':
          return 'location_x.gte.80,location_x.lt.120';
        case 'left_wing':
          return 'location_y.gte.0,location_y.lt.26';
        case 'right_wing':
          return 'location_y.gte.54,location_y.lt.80';
        case 'center':
          return 'location_y.gte.27,location_y.lt.53';
        case 'penalty_box':
          return 'location_x.gte.102,location_x.lt.120 and location_y.gte.18,location_y.lt.62';
        case 'six_yard_box':
          return 'location_x.gte.114,location_x.lt.120 and location_y.gte.30,location_y.lt.50';
        default:
          return null;
      }
    }).filter(Boolean);
    if (zoneConditions.length > 0) {
      query = query.or(zoneConditions.join(','));
    }
  }

  if (filters.outcomes && filters.outcomes.length > 0) {
    query = query.in('outcome_name', filters.outcomes);
  }

  return query;
}

function getAppliedFilters(filters: EventFilters): string[] {
  const appliedFilters: string[] = [];

  if (filters.playerNames?.length) appliedFilters.push('playerNames')
  if (filters.playerIds?.length) appliedFilters.push('playerIds')
  if (filters.teamNames?.length) appliedFilters.push('teamNames')
  if (filters.teamIds?.length) appliedFilters.push('teamIds')
  if (filters.eventTypes?.length) appliedFilters.push('eventTypes')
  if (filters.matchId) appliedFilters.push('matchId')
  if (filters.matchIds?.length) appliedFilters.push('matchIds')
  if (filters.competitionNames?.length) appliedFilters.push('competitionNames')
  if (filters.timeRange) appliedFilters.push('timeRange')
  if (filters.period?.length) appliedFilters.push('period')
  if (filters.zones?.length) appliedFilters.push('zones')
  if (filters.xRange) appliedFilters.push('xRange')
  if (filters.yRange) appliedFilters.push('yRange')
  if (filters.outcomes?.length) appliedFilters.push('outcomes')

  return appliedFilters;
}

export async function getPlayerEvents(playerName: string, eventTypes?: string[], limit = 1000) {
  return callDataAgent({
    filters: {
      playerNames: [playerName],
      eventTypes
    },
    limit,
  })
}

export async function getMatchEvents(matchId: number, limit=5000) {
  return callDataAgent({
    filters: {
      matchId,
    },
    limit,
  })
}

export async function getEventsInZone(zone: string, eventTypes?: string[], limit=5000) {
  return callDataAgent({
    filters: {
      zones: [zone as any],
      eventTypes,
    },
    limit,
  })
}