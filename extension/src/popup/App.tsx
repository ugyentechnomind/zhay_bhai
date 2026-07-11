import { useEffect, useState } from "react";
import type { CalendarEvent, ExcuseTone } from "@zhay-bhai/shared";
import { EXCUSE_TONE_LABELS } from "@zhay-bhai/shared";
import { getSettings } from "../lib/storage";

const TONES = Object.keys(EXCUSE_TONE_LABELS) as ExcuseTone[];

type Message =
  | { type: "FETCH_EVENTS" }
  | { type: "BUNK_MEETING"; eventId: string; tone: ExcuseTone; autoSend?: boolean };

function send<T>(message: Message): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  return chrome.runtime.sendMessage(message);
}

export function App() {
  const [paired, setPaired] = useState<boolean | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then((s) => setPaired(Boolean(s.token)));
  }, []);

  useEffect(() => {
    if (paired) void refresh();
  }, [paired]);

  async function refresh() {
    setLoading(true);
    setError(null);
    const res = await send<CalendarEvent[]>({ type: "FETCH_EVENTS" });
    if (res.ok) setEvents(res.data);
    else setError(res.error);
    setLoading(false);
  }

  if (paired === null) return null;

  if (!paired) {
    return (
      <div className="app">
        <div className="app-header">
          <h1>Zhay Bhai AI</h1>
        </div>
        <p className="empty-state">
          Not paired yet.{" "}
          <a href="#" onClick={() => chrome.runtime.openOptionsPage()}>
            Open settings
          </a>{" "}
          and paste your access token from the web dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1>Zhay Bhai AI</h1>
        <button className="btn" onClick={refresh} disabled={loading}>
          {loading ? "Syncing…" : "Sync"}
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
      {events.length === 0 && !loading && <p className="empty-state">No events in the ±5 day window.</p>}
      {events.map((event) => (
        <EventRow key={event.id} event={event} onBunked={refresh} />
      ))}
    </div>
  );
}

function EventRow({ event, onBunked }: { event: CalendarEvent; onBunked: () => void }) {
  const [tone, setTone] = useState<ExcuseTone>("work_conflict");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function bunk() {
    setBusy(true);
    setError(null);
    const res = await send<{ sent: boolean }>({
      type: "BUNK_MEETING",
      eventId: event.id,
      tone,
      autoSend: true,
    });
    setBusy(false);
    if (res.ok) onBunked();
    else setError(res.error);
  }

  return (
    <div className="event">
      <p className="event-title">{event.title}</p>
      <p className="event-meta">
        {new Date(event.startTime).toLocaleString()} · {event.organizerEmail ?? "no organizer"}
      </p>
      {event.status === "bunked" ? (
        <span className="badge">Bunked ✓</span>
      ) : (
        <div className="event-actions">
          <select value={tone} onChange={(e) => setTone(e.target.value as ExcuseTone)}>
            {TONES.map((t) => (
              <option key={t} value={t}>
                {EXCUSE_TONE_LABELS[t]}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={bunk} disabled={busy || !event.organizerEmail}>
            {busy ? "Bunking…" : "Bunk 🙈"}
          </button>
        </div>
      )}
      {!event.organizerEmail && <p className="error-text">No organizer email - can&apos;t send.</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
