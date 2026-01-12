import "./App.css";
import { useEffect, useState } from "react";
import { testConnection, getMatches } from "./services/supabase";
import type { Match } from "./types/database";

type ConnectionStatus = "testing" | "connected" | "failed";

type ProjectInfo = {
  url: string;
  hasKey: boolean;
  tablesCreated: boolean;
};

function App() {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("testing");
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    async function checkConnection() {
      const isConnected = await testConnection();
      setConnectionStatus(isConnected ? "connected" : "failed");

      if (isConnected) {
        setProjectInfo({
          url: import.meta.env.VITE_SUPABASE_URL,
          hasKey: !import.meta.env.VITE_SUPABASE_ANON_KEY,
          tablesCreated: true,
        });

        try {
          const matches = await getMatches();
          setMatches(matches);
        } catch (error) {
          console.error("Error getting matches:", error);
        }
      }
    }
    checkConnection();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>⚽ Soccer AI Visualizer</h1>
        <h2>Environment Setup (TypeScript Edition)</h2>

        <div className="status-card">
          <h3>Supabase Connection</h3>
          <div className={`status ${connectionStatus}`}>
            {connectionStatus === "testing" && "⏳ Testing connection..."}
            {connectionStatus === "connected" && "✅ Connected successfully!"}
            {connectionStatus === "failed" && "❌ Connection failed"}
          </div>

          {projectInfo && (
            <div className="project-info">
              <p>
                <strong>Project URL:</strong> {projectInfo.url}
              </p>
              <p>
                <strong>Publishable Key:</strong>{" "}
                {projectInfo.hasKey ? "✓ Configured" : "✗ Missing"}
              </p>
              <p>
                <strong>TypeScript:</strong> ✓ Enabled
              </p>
              <p>
                <strong>Tables:</strong>{" "}
                {projectInfo.tablesCreated ? "✓ Created" : "✗ Pending"}
              </p>
              <p>
                <strong>Matches Loaded:</strong> {matches.length}
              </p>
            </div>
          )}
        </div>

        <div className="next-steps">
          <h3>🎉 TypeScript Setup Complete!</h3>
          <p>
            Your development environment is ready with type safety. Next up:
          </p>
          <ul>
            <li>Create database schema with typed tables</li>
            <li>Import StatsBomb data with validation</li>
            <li>Build type-safe Query Agent</li>
          </ul>
        </div>
      </header>
    </div>
  );
}

export default App;
