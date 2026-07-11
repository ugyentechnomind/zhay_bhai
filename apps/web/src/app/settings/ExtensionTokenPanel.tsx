"use client";

import { useState } from "react";

export function ExtensionTokenPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/extension/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Browser extension" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create token");
      setToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create token");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={generate}
        disabled={busy}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Generating…" : "Generate new token"}
      </button>

      {token && (
        <div className="mt-3 rounded-md bg-zinc-100 p-3">
          <p className="text-xs text-zinc-500">
            Copy this now - it won&apos;t be shown again. Paste it into the extension&apos;s options page.
          </p>
          <code className="mt-1 block break-all text-sm">{token}</code>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
