import { useEffect, useState } from "react";
import { getSettings, setSettings } from "../lib/storage";

export function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState("http://localhost:3000");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setApiBaseUrl(s.apiBaseUrl);
      setToken(s.token ?? "");
    });
  }, []);

  async function save() {
    await setSettings({ apiBaseUrl: apiBaseUrl.replace(/\/$/, ""), token: token || null });
    setStatus("Saved ✓");
    setTimeout(() => setStatus(null), 2000);
  }

  return (
    <div className="app">
      <h1>Bunk It - Settings</h1>
      <p className="hint">
        Open your Bunk It web dashboard's Settings page, generate a token, and paste it below.
      </p>

      <label htmlFor="apiBaseUrl">Web app URL</label>
      <input
        id="apiBaseUrl"
        value={apiBaseUrl}
        onChange={(e) => setApiBaseUrl(e.target.value)}
        placeholder="http://localhost:3000"
      />

      <label htmlFor="token">Access token</label>
      <input
        id="token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="bunk_..."
        type="password"
      />

      <button onClick={save}>Save</button>
      {status && <p className="status ok">{status}</p>}
    </div>
  );
}
