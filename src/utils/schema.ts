import { z } from 'zod';

export const EventFilterSchema = z.object({
  playerNames: z.array(z.string()).optional(),
  playerIds: z.array(z.number()).optional(),
  teamNames: z.array(z.string()).optional(),
  teamIds: z.array(z.number()).optional(),
  eventTypes: z.array(z.string()).optional(),
  matchId: z.number().optional(),
  matchIds: z.array(z.number()).optional(),
  competitionNames: z.array(z.string()).optional(),
  timeRange: z.object({
    start: z.number(),
    end: z.number(),
  }).optional(),
  periods: z.array(z.union([z.literal(1), z.literal(2)])).optional(),
  zones: z.array(z.string()).optional(),
  xRange: z.object({
    min: z.number(),
    max: z.number(),
  }).optional(),
  yRange: z.object({
    min: z.number(),
    max: z.number(),
  }).optional(),
  outcomes: z.array(z.string()).optional(),
  limit: z.number().optional(),
});

export const QueryAgentOutputSchema = z.object({
  intent: z.enum(['visualization', 'comparison', 'statistics', 'question', 'clarification', 'unknown']),
  filters: EventFilterSchema,
  visualizationType: z.enum(['heatmap', 'passmap', 'shotmap', 'timeline', 'comparison', 'network']).optional(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string()
});

export type QueryAgentOutputValidated = z.infer<typeof QueryAgentOutputSchema>;