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
    <div>
      <div className="mb-4">
        <h2>Query Agent Test</h2>
        <p>
          Test the query agent with natural language queries. Click on an
          example to fill the input field.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your query..."
          className="w-full p-2 border border-gray-300 rounded-md"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-blue-500 text-white p-2 rounded-md"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      <div>
        <div>
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example}
              onClick={() => handleExampleClick(example)}
              className="bg-blue-500 text-white p-2 rounded-md"
              disabled={loading}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="text-red-500">{error}</div>}

      {result && (
        <div>
          <div>
            <h3>Parsed Query</h3>
            <span
              className={`confidence confidence-${getConfidenceLevel(result.confidence)}`}
            >
              Confidence: {(result.confidence * 100).toFixed(0)}%
            </span>
          </div>

          <div>
            <div>
              <h4>Intent</h4>
              <span className={`intent-badge intent-${result.intent}`}>
                {result.intent}
              </span>
            </div>

            {result.visualizationType && (
              <div>
                <h4>Visualization Type</h4>
                <span
                  className={`visualization-type-badge visualization-type-${result.visualizationType}`}
                >
                  {result.visualizationType}
                </span>
              </div>
            )}

            <div>
              <h4>Reasoning</h4>
              <span className="reasoning">{result.reasoning}</span>
            </div>

            <div>
              <h4>Filters</h4>
              <pre>{JSON.stringify(result.filters, null, 2)}</pre>
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
