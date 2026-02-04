import { useState } from "react";
import { callQueryAgent } from "@/services/queryAgent";
import { callDataAgent } from "@/services/dataAgent";
import type { QueryAgentOutput, DataAgentOutput } from "@/types/agents";
import "./QueryDataTest.css";

const EXAMPLE_QUERIES = [
  "Show me all passes by Messi in the final third",
  "Cristiano Ronaldo's shots",
  "All goals in the Champions League",
  "De Bruyne's passes in the first half",
  "Defensive actions by Barcelona",
  "Show me all completed passes by Benzema",
  "Shots from outside the penalty box",
  "All interceptions in the defensive third",
];

export function QueryDataTest() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryAgentOutput | null>(null);
  const [dataResult, setDataResult] = useState<DataAgentOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setQueryResult(null);
    setDataResult(null);

    try {
      // Step 1: Parse query with Query Agent
      console.log("Step 1: Calling Query Agent...");
      const parsedQuery = await callQueryAgent({
        userMessage: query,
        conversationHistory: [],
      });

      setQueryResult(parsedQuery);

      // Step 2: Fetch data with Data Agent
      console.log("Step 2: Calling Data Agent...");
      const fetchedData = await callDataAgent({
        filters: parsedQuery.filters,
        limit: 500, // Limit for UI performance
      });

      setDataResult(fetchedData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="query-data-test">
      <div className="test-header">
        <h2>🤖 Full Agent Pipeline Test</h2>
        <p>Query Agent → Data Agent → Results</p>
      </div>

      <form onSubmit={handleSubmit} className="query-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about soccer events..."
          className="query-input"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !query.trim()}>
          {loading ? "⏳ Processing..." : "🚀 Execute"}
        </button>
      </form>

      <div className="examples">
        <p>
          <strong>Try these:</strong>
        </p>
        <div className="example-chips">
          {EXAMPLE_QUERIES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setQuery(ex)}
              className="example-chip"
              disabled={loading}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="error-box">
          <h3>❌ Error</h3>
          <pre>{error}</pre>
        </div>
      )}

      {/* Query Agent Result */}
      {queryResult && (
        <div className="agent-result">
          <div className="agent-header">
            <h3>🗣️ Query Agent Output</h3>
            <span
              className={`confidence confidence-${getConfidenceLevel(
                queryResult.confidence
              )}`}
            >
              {(queryResult.confidence * 100).toFixed(0)}% confident
            </span>
          </div>

          <div className="agent-content">
            <div className="info-row">
              <span className="label">Intent:</span>
              <span className={`badge intent-${queryResult.intent}`}>
                {queryResult.intent}
              </span>
            </div>

            {queryResult.visualizationType && (
              <div className="info-row">
                <span className="label">Visualization:</span>
                <span className="badge viz-badge">
                  {queryResult.visualizationType}
                </span>
              </div>
            )}

            <div className="info-row">
              <span className="label">Reasoning:</span>
              <p className="reasoning">{queryResult.reasoning}</p>
            </div>

            <div className="filters-section">
              <span className="label">Filters:</span>
              <pre className="filters-json">
                {JSON.stringify(queryResult.filters, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Data Agent Result */}
      {dataResult && (
        <div className="agent-result">
          <div className="agent-header">
            <h3>📊 Data Agent Output</h3>
            <div className="stats">
              <span className="stat">{dataResult.events.length} events</span>
              <span className="stat">{dataResult.executionTime}ms</span>
            </div>
          </div>

          <div className="agent-content">
            {dataResult.error ? (
              <div className="error-message">❌ {dataResult.error}</div>
            ) : (
              <>
                <div className="data-summary">
                  <div className="summary-stat">
                    <div className="stat-value">{dataResult.totalCount}</div>
                    <div className="stat-label">Total Matches</div>
                  </div>
                  <div className="summary-stat">
                    <div className="stat-value">{dataResult.events.length}</div>
                    <div className="stat-label">Events Returned</div>
                  </div>
                  <div className="summary-stat">
                    <div className="stat-value">
                      {dataResult.executionTime}ms
                    </div>
                    <div className="stat-label">Query Time</div>
                  </div>
                </div>

                {dataResult.metadata && (
                  <div className="metadata">
                    <span className="label">Filters Applied:</span>
                    <div className="filter-badges">
                      {dataResult.metadata.filtersApplied.map((filter) => (
                        <span key={filter} className="filter-badge">
                          {filter}
                        </span>
                      ))}
                    </div>
                    {dataResult.metadata.limited && (
                      <div className="warning">
                        ⚠️ Results limited to {dataResult.events.length} events
                      </div>
                    )}
                  </div>
                )}

                {/* Sample Events */}
                <div className="events-preview">
                  <h4>Sample Events (first 10):</h4>
                  <div className="events-table">
                    <div className="table-header">
                      <div>Minute</div>
                      <div>Type</div>
                      <div>Player</div>
                      <div>Team</div>
                      <div>Location</div>
                      <div>Outcome</div>
                    </div>
                    {dataResult.events.slice(0, 10).map((event, i) => (
                      <div key={i} className="table-row">
                        <div>{event.minute}'</div>
                        <div className="event-type">{event.event_type}</div>
                        <div>{event.player_name || "-"}</div>
                        <div className="team-name">{event.team_name}</div>
                        <div className="location">
                          ({event.location_x?.toFixed(1)},{" "}
                          {event.location_y?.toFixed(1)})
                        </div>
                        <div
                          className={`outcome ${
                            event.outcome_name ? "has-outcome" : ""
                          }`}
                        >
                          {event.outcome_name || "✓"}
                        </div>
                      </div>
                    ))}
                  </div>
                  {dataResult.events.length > 10 && (
                    <p className="more-events">
                      ... and {dataResult.events.length - 10} more events
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getConfidenceLevel(confidence: number): string {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}
