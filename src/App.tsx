import "./App.css";
import { useState } from "react";
import { QueryAgentTest } from "./components/QueryAgentTest";
import { QueryDataTest } from "./components/QueryDataTest";

function App() {
  const [activeTab, setActiveTab] = useState<
    "query-agent" | "data-query" | "data-explorer"
  >("query-agent");

  return (
    <div className="App">
      <nav className="app-nav">
        <h1>⚽ Soccer AI Visualizer</h1>
        <div>
          <button
            onClick={() => setActiveTab("query-agent")}
            className={`app-nav button ${
              activeTab === "query-agent" ? "active" : ""
            }`}
          >
            Query Agent
          </button>
          <button
            onClick={() => setActiveTab("data-query")}
            className={`app-nav button ${
              activeTab === "data-query" ? "active" : ""
            }`}
          >
            Data Query
          </button>
        </div>
      </nav>

      <main className="app-main">
        {activeTab === "query-agent" && <QueryAgentTest />}
        {activeTab === "data-query" && <QueryDataTest />}
      </main>
    </div>
  );
}

export default App;
