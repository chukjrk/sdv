import { useState } from "react";
import { callQueryAgent } from "@/services/queryAgent";
import type { QueryAgentOutput } from "@/types/agents";
import "./QueryAgentTest.css";

const EXAMPLE_QUERIES = [
  "Show me Messi's passes in the final third",
  "Compare Messi and Ronaldo's shots",
  "All goals in the Champions League",
  "Show me De Bruyne's passes in the final half",
  "Defensive actions by Liverpool in their own half",
];

export function QueryAgentTest() {
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<QueryAgentOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const output = await callQueryAgent({
        userMessage: query,
        conversationHistory: [],
      });
      setResult(output);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  function handleExampleClick(exampleQuery: string) {
    setQuery(exampleQuery);
    // handleSubmit(new Event("submit"));
  }

  return (
    <div className="query-agent-container">
      {/* Header Section */}
      <div className="query-agent-header">
        <h2 className="query-agent-title">Query Agent Test</h2>
        <p className="query-agent-description">
          Test the query agent with natural language queries. Click on an example to fill the input field.
        </p>
      </div>

      {/* Query Input Section */}
      <form onSubmit={handleSubmit} className="query-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your query..."
          className="query-input"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="query-button"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {/* Example Queries Section */}
      <div className="examples-section">
        <h3 className="examples-title">Example Queries</h3>
        <div className="examples-grid">
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example}
              onClick={() => handleExampleClick(example)}
              className="example-button"
              disabled={loading}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-container">
          <p className="error-title">Error</p>
          <p className="error-message">{error}</p>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="results-container">
          {/* Confidence Section */}
          <div className="confidence-section">
            <h3 className="section-title">Parsed Query</h3>
            <span
              className={`confidence confidence-${getConfidenceLevel(result.confidence)}`}
            >
              Confidence: {(result.confidence * 100).toFixed(0)}%
            </span>
          </div>

          {/* Query Details */}
          <div className="details-container">
            {/* Intent */}
            <div className="detail-item">
              <h4 className="detail-label">Intent</h4>
              <span className={`intent-badge intent-${result.intent}`}>
                {result.intent}
              </span>
            </div>

            {/* Visualization Type */}
            {result.visualizationType && (
              <div className="detail-item">
                <h4 className="detail-label">Visualization Type</h4>
                <span
                  className={`visualization-type-badge visualization-type-${result.visualizationType}`}
                >
                  {result.visualizationType}
                </span>
              </div>
            )}

            {/* Reasoning */}
            <div className="detail-item">
              <h4 className="detail-label">Reasoning</h4>
              <p className="reasoning-container">
                <span className="reasoning">{result.reasoning}</span>
              </p>
            </div>

            {/* Filters */}
            <div className="detail-item">
              <h4 className="detail-label">Filters</h4>
              <pre className="filters-code">
                {JSON.stringify(result.filters, null, 2)}
              </pre>
            </div>
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
