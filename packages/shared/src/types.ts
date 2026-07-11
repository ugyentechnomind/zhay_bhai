/** Shared types used by both the web dashboard and the browser extension. */

export type ExcuseTone =
  | "sick"
  | "family_emergency"
  | "transport"
  | "work_conflict"
  | "connectivity";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  organizerEmail: string | null;
  organizerName: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  htmlLink: string | null;
}

export interface GenerateExcuseRequest {
  eventTitle: string;
  organizerName: string | null;
  tone: ExcuseTone;
  senderFirstName?: string;
}

export interface GenerateExcuseResponse {
  subject: string;
  body: string;
}

export interface SendExcuseRequest {
  /** The Google refresh token stored in the browser - there is no server-side session. */
  refreshToken: string;
  to: string;
  subject: string;
  body: string;
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
  "https://www.googleapis.com/auth/userinfo.email",
];

export const EXCUSE_TONE_LABELS: Record<ExcuseTone, string> = {
  sick: "Feeling unwell",
  family_emergency: "Family emergency",
  transport: "Transport / travel issue",
  work_conflict: "Conflicting work priority",
  connectivity: "Connectivity / tech issue",
};
