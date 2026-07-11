import type { CalendarEvent, ExcuseTone } from "@zhay-bhai/shared";
import { getSettings } from "./storage";

interface DbEventRow {
  id: string;
  user_id: string;
  google_event_id: string;
  title: string;
  description: string | null;
  organizer_email: string | null;
  organizer_name: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  status: CalendarEvent["status"];
  html_link: string | null;
}

function mapDbEvent(e: DbEventRow): CalendarEvent {
  return {
    id: e.id,
    userId: e.user_id,
    googleEventId: e.google_event_id,
    title: e.title,
    description: e.description,
    organizerEmail: e.organizer_email,
    organizerName: e.organizer_name,
    location: e.location,
    startTime: e.start_time,
    endTime: e.end_time,
    status: e.status,
    htmlLink: e.html_link,
  };
}

export class NotPairedError extends Error {
  constructor() {
    super("Not paired yet - open the extension options page and paste your access token.");
    this.name = "NotPairedError";
  }
}

async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiBaseUrl, token } = await getSettings();
  if (!token) throw new NotPairedError();

  const res = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchEvents(): Promise<CalendarEvent[]> {
  const data = await authedFetch<{ events: DbEventRow[] }>("/api/extension/events");
  return data.events.map(mapDbEvent);
}

export interface BunkResult {
  excuseId: string;
  subject: string;
  body: string;
  sent: boolean;
  sentAt?: string;
}

export async function bunkMeeting(
  eventId: string,
  tone: ExcuseTone,
  autoSend = true,
): Promise<BunkResult> {
  return authedFetch<BunkResult>("/api/extension/bunk", {
    method: "POST",
    body: JSON.stringify({ eventId, tone, autoSend }),
  });
}
