import type { Event, Match, Player } from './database';

// ============================================
// QUERY AGENT
// ============================================
export interface QueryAgentInput {
  userMessage: string
  conversationHistory?: Message[]
}

export interface QueryAgentOutput {
  intent: 'visualization' | 'comparison' | 'question' | 'unknown'
  filters: EventFilters
  visualizationType?: VisualizationType
  confidence: number
  reasoning?: string
}

export type VisualizationType = 
  | 'heatmap' 
  | 'passmap'
  | 'shotmap'
  | 'timeline' 
  | 'comparison'
  | 'player_movement'

export interface EventFilters {
  playerNames?: string[]
  playerIds?: number[]
  teamNames?: string[]
  teamIds?: number[]
  eventTypes?: string[]
  matchId?: number
  matchIds?: number[]
  timeRange?: { start: number; end: number }
  zones?: PitchZone[]
  outcome?: string
  period?: 1 | 2
}

export type PitchZone = 
  | 'defensive_third' 
  | 'middle_third' 
  | 'final_third'
  | 'left_wing'
  | 'right_wing'
  | 'center'

// ============================================
// DATA AGENT
// ============================================
export interface DataAgentInput {
  filters: EventFilters
  limit?: number
  offset?: number
  includeMatch?: boolean
  includePlayer?: boolean
}

export interface DataAgentOutput {
  events: Event[]
  matches?: Match[]
  players?: Player[]
  totalCount: number
  executionTime: number
  query?: string
}

// ============================================
// INSIGHT AGENT
// ============================================

export interface InsightAgentInput {
  events: Event[]
  context: string
  analysisType: AnalysisType
  playerNames?: string[]
}

export type AnalysisType = 
  | 'summary' 
  | 'highlights' 
  | 'comparison' 
  | 'tactical'
  | 'performance'

export interface InsightAgentOutput {
  summary: string
  highlights: string[]
  metrics?: Record<string, number>
  confidence: number
  sources: string[]
}

// ============================================
// VISUALIZATION AGENT
// ============================================

export interface VisualizationAgentInput {
  events: Event[]
  context: string
  options: VizOptions
}

export interface VizOptions {
  showHeatmap?: boolean
  showArrowws?: boolean
  colorByOutcome?: boolean
  showTimeline?: boolean
  highlightPlayer?: string
  compareMode?: boolean
}

export interface VisualizationAgentOutput {
  type: VisualizationType
  data: EventForViz[]
  config: VizConfig
  annotations?: Annotation[]
}

export interface VizConfig {
  width: number
  height: number
  pitchDimensions: {
    width: number
    height: number
  }
  colorScheme: string[]
  showLegend: boolean
}

export interface Annotation {
  text: string
  x: number
  y: number
  type: 'highlight' | 'label' | 'metric'
}

// ==========================================
// COORDINATOR
// ==========================================
export interface CoordinatorInput {
  userMessage: string
  conversationHistory: Message[]
}

export interface CoordinatorOutput {
  response: string
  visualization?: VisualizationAgentOutput
  insights?: InsightAgentOutput
  agentsCalled: string[]
  executionTime: number
}

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: Record<string, any>
}

import type { EventForViz } from './database';