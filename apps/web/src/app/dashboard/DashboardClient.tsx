"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CalendarEvent, ExcuseTone } from "@zhay-bhai/shared";
import { EXCUSE_TONE_LABELS } from "@zhay-bhai/shared";
import { createClient } from "@/lib/supabase/client";

const TONES = Object.keys(EXCUSE_TONE_LABELS) as ExcuseTone[];

export function DashboardClient({
  userEmail,
  googleConnected,
  initialEvents,
}: {
  userEmail: string;
  googleConnected: boolean;
  initialEvents: CalendarEvent[];
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openEventId, setOpenEventId] = useState<string | null>(null);

  async function sync() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // eslint-disable-next-line react-hooks/purity -- only used to group events into past/upcoming for display
  const now = Date.now();
  const past = events.filter((e) => new Date(e.startTime).getTime() < now);
  const upcoming = events.filter((e) => new Date(e.startTime).getTime() >= now);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Zhay Bhai AI</h1>
          <p className="text-sm text-zinc-500">{userEmail}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/settings")}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            Settings
          </button>
          <button onClick={signOut} className="rounded-md border px-3 py-1.5 text-sm">
            Sign out
          </button>
        </div>
      </header>

      {!googleConnected && (
        <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Google account not fully connected (missing calendar/gmail permissions). Sign out
          and sign back in, accepting all requested permissions.
        </p>
      )}

      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={sync}
          disabled={syncing}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync calendar (±5 days)"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <EventGroup
        title="Upcoming"
        events={upcoming}
        openEventId={openEventId}
        setOpenEventId={setOpenEventId}
        onBunked={(id) =>
          setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status: "bunked" } : e)))
        }
      />
      <EventGroup
        title="Past 5 days"
        events={past}
        openEventId={openEventId}
        setOpenEventId={setOpenEventId}
        onBunked={(id) =>
          setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status: "bunked" } : e)))
        }
      />
    </div>
  );
}

function EventGroup({
  title,
  events,
  openEventId,
  setOpenEventId,
  onBunked,
}: {
  title: string;
  events: CalendarEvent[];
  openEventId: string | null;
  setOpenEventId: (id: string | null) => void;
  onBunked: (id: string) => void;
}) {
  if (events.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h2>
      <ul className="flex flex-col gap-3">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isOpen={openEventId === event.id}
            onToggle={() => setOpenEventId(openEventId === event.id ? null : event.id)}
            onBunked={() => onBunked(event.id)}
          />
        ))}
      </ul>
    </section>
  );
}

function EventCard({
  event,
  isOpen,
  onToggle,
  onBunked,
}: {
  event: CalendarEvent;
  isOpen: boolean;
  onToggle: () => void;
  onBunked: () => void;
}) {
  const [tone, setTone] = useState<ExcuseTone>("work_conflict");
  const [draft, setDraft] = useState<{ excuseId: string; subject: string; body: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(event.status === "bunked");

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/excuses/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate excuse");
      setDraft(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate excuse");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/excuses/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          excuseId: draft.excuseId,
          subject: draft.subject,
          body: draft.body,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send excuse");
      setSent(true);
      onBunked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send excuse");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{event.title}</p>
          <p className="text-sm text-zinc-500">
            {new Date(event.startTime).toLocaleString()} · {event.organizerEmail ?? "no organizer"}
          </p>
        </div>
        {sent ? (
          <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            Bunked ✓
          </span>
        ) : (
          <button
            onClick={onToggle}
            className="shrink-0 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white"
          >
            Bunk this 🙈
          </button>
        )}
      </div>

      {isOpen && !sent && (
        <div className="mt-4 flex flex-col gap-3 border-t pt-4">
          <label className="text-sm">
            Reason
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as ExcuseTone)}
              className="mt-1 block w-full rounded-md border px-2 py-1.5 text-sm"
            >
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {EXCUSE_TONE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>

          {!draft ? (
            <button
              onClick={generate}
              disabled={busy || !event.organizerEmail}
              className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {busy ? "Generating…" : "Generate excuse"}
            </button>
          ) : (
            <>
              <input
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                className="rounded-md border px-2 py-1.5 text-sm font-medium"
              />
              <textarea
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                rows={5}
                className="rounded-md border px-2 py-1.5 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={send}
                  disabled={busy}
                  className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {busy ? "Sending…" : `Send to ${event.organizerEmail}`}
                </button>
                <button onClick={() => setDraft(null)} className="rounded-md border px-3 py-1.5 text-sm">
                  Regenerate
                </button>
              </div>
            </>
          )}
          {!event.organizerEmail && (
            <p className="text-xs text-red-600">No organizer email on this event - can&apos;t send.</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </li>
  );
}
