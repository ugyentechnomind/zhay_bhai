/** Shared types used by both the web dashboard and the browser extension. */

export type ExcuseTone =
  | "sick"
  | "family_emergency"
  | "transport"
  | "work_conflict"
  | "connectivity";

export type EventRsvpStatus = "needsAction" | "accepted" | "declined" | "tentative" | "bunked";

export interface CalendarEvent {
  id: string;
  userId: string;
  googleEventId: string;
  title: string;
  description: string | null;
  organizerEmail: string | null;
  organizerName: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  status: EventRsvpStatus;
  htmlLink: string | null;
}

export interface Excuse {
  id: string;
  userId: string;
  eventId: string;
  tone: ExcuseTone;
  subject: string;
  body: string;
  sentAt: string | null;
  createdAt: string;
}

export interface GenerateExcuseRequest {
  eventId: string;
  tone: ExcuseTone;
}

export interface GenerateExcuseResponse {
  excuseId: string;
  subject: string;
  body: string;
}

export interface SendExcuseRequest {
  excuseId: string;
  /** Allow the user to tweak the AI draft before it goes out. */
  subject?: string;
  body?: string;
}

export interface SendExcuseResponse {
  sent: boolean;
  sentAt: string;
}

export interface ApiError {
  error: string;
}

/** Google OAuth scopes the app requests: read the calendar, send mail as the user. */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

export const EXCUSE_TONE_LABELS: Record<ExcuseTone, string> = {
  sick: "Feeling unwell",
  family_emergency: "Family emergency",
  transport: "Transport / travel issue",
  work_conflict: "Conflicting work priority",
  connectivity: "Connectivity / tech issue",
};
