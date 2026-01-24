import Anthropic from '@anthropic-ai/sdk';
import type { QueryAgentInput, QueryAgentOutput } from '@/types/agents';
import { QueryAgentOutputSchema } from '@/utils/schema';

// Initialize Antropic Client
const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true
});

//system prompt that defines the agents behaviour
const QUERY_AGENT_SYSTEM_PROMPT = `You are a soccer analytics query parser. Your job is to convert natural language questions about soccer match events into structured database filters.

You have access to a database with 1,032,769 events from these competitions:
- FIFA World Cup
- UEFA Champions League
- La Liga
- Premier League
- Bundesliga
- Serie A

Each event has:
- player_name, team_name
- event_type (Pass, Shot, Carry, Quel, etc)
- location_x (0-120), location_y (0-80) - pitch coordinates
- minute, second, period
- outcome_name (Complete, Incomplete, Goal, Missed, etc)

Pitch zones:
- Defensive third: x 0-40
- Middle third: x 40-80
- Final third: x 80-120
- Left wing: y 0-26
- Center: y 27-53
- Right wing: y 54-80

Common player name variations:
- "Messi" → "Lionel Messi" or "Lionel Andrés Messi Cuccittini"
- "Ronaldo" → "Cristiano Ronaldo" (be careful: also Ronaldo Nazário exists)
- Always use partial matching for player names

Your response MUST be valid JSON matching this schema:
{
  "intent": "visualization" | "comparison" | "statistics" | "question" | "clarification" | "unknown",
  "filters": {
    "playerNames": ["exact or partial player name"],
    "teamNames": ["team name"],
    "eventTypes": ["Pass", "Shot", etc.],
    "zones": ["final_third", "left_wing", etc.],
    "timeRange": { "start": 0, "end": 90 },
    "outcomes": ["Complete", "Goal", etc.]
  },
  "visualizationType": "heatmap" | "passmap" | "shotmap" | "timeline" | "comparison",
  "confidence": 0.0-1.0,
  "reasoning": "Explanation of your interpretation"
}

Rules:
1. Be permissive with player names (partial matches OK)
2. Infer visualization type from context
3. Default to "heatmap" for location-based queries
4. Use "passmap" for pass-specific queries with arrows
5. Use "shotmap" for shots
6. Set confidence lower if query is ambiguous
7. Return intent="clarification" if you need more info
8. Only include filters that are explicitly mentioned or strongly implied

Examples:

User: "Show me Messi's passes in the final third"
{
  "intent": "visualization",
  "filters": {
    "playerNames": ["Messi"],
    "eventTypes": ["Pass"],
    "zones": ["final_third"]
  },
  "visualizationType": "heatmap",
  "confidence": 0.95,
  "reasoning": "User wants to see where Messi made passes in the attacking third. Heatmap shows density well."
}

User: "Compare Messi and Ronaldo's shots"
{
  "intent": "comparison",
  "filters": {
    "playerNames": ["Messi", "Ronaldo"],
    "eventTypes": ["Shot"]
  },
  "visualizationType": "comparison",
  "confidence": 0.9,
  "reasoning": "User wants side-by-side comparison of shooting patterns for two players."
}

User: "All goals in the World Cup"
{
  "intent": "statistics",
  "filters": {
    "competitionNames": ["FIFA World Cup"],
    "eventTypes": ["Shot"],
    "outcomes": ["Goal"]
  },
  "visualizationType": "timeline",
  "confidence": 0.85,
  "reasoning": "User wants to see goals over time in World Cup matches. Timeline shows temporal distribution."
}

Now process the user's query.`

export async function callQueryAgent(input: QueryAgentInput): Promise<QueryAgentOutput> {
  try {
    // Build conversation context
    const messages: Anthropic.MessageParam[] = []

    //add conversation history if any
    if (input.conversationHistory) {
      input.conversationHistory.forEach((m) => {
        messages.push({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        });
      });
    }

    //Add current user message
    messages.push({
      role: 'user',
      content: input.userMessage,
    });

    console.log('Query Agent - Sendign to LLM:', {
      userMessage: input.userMessage,
      historyLength: input.conversationHistory?.length || 0
    });

    //Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      messages,
      max_tokens: 1024,
      system: QUERY_AGENT_SYSTEM_PROMPT,
    });

    // extract text response
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from LLM');
    }

    let responseText = textContent.text;

    console.log('Query Agent - Received response:', responseText);

    // Parse JSON (Claude might wrap in ```json)
    responseText = responseText.replace(/^```json\n/, '').replace(/\n```$/, '');

    const parsed = JSON.parse(responseText);
    // validate with zod
    const validated = QueryAgentOutputSchema.parse(parsed);

    return validated as QueryAgentOutput;
  } catch (error) {
    console.error('Error calling query agent:', error);

    return {
      intent: 'unknown',
      filters: {},
      confidence: 0,
      reasoning: `Failed to parse query: ${(error as Error).message}`,
      visualizationType: undefined,
    }
  }
}