import "./App.css";
import { useEffect, useState } from "react";
import { QueryAgentTest } from "./components/QueryAgentTest";

function App() {
  const [activeTab, setActiveTab] = useState<"query-agent" | "data-explorer">(
    "query-agent",
  );

  return (
    <div className="App">
      <nav className="app-nav">
        <h1>⚽ Soccer AI Visualizer</h1>
        <div>
          <button
            onClick={() => setActiveTab("query-agent")}
            className={`app-nav button ${activeTab === "query-agent" ? "active" : ""}`}
          >
            Query Agent
          </button>
        </div>
      </nav>

      <main className="app-main">
        {activeTab === "query-agent" && <QueryAgentTest />}
      </main>
    </div>
  );
}

export default App;
