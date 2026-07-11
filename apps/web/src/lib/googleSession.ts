export const GOOGLE_SESSION_STORAGE_KEY = "zhay-bhai:google-session";
const BUNKED_STORAGE_KEY = "zhay-bhai:bunked-event-ids";

export interface GoogleSession {
  refreshToken: string;
  email: string;
}

export function getGoogleSession(): GoogleSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(GOOGLE_SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GoogleSession;
  } catch {
    return null;
  }
}

export function clearGoogleSession() {
  localStorage.removeItem(GOOGLE_SESSION_STORAGE_KEY);
}

/** Bunked events aren't persisted server-side (there's no server), so we
 * remember which event ids the user has already sent a decline for locally. */
export function getBunkedEventIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(BUNKED_STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markEventBunked(eventId: string) {
  const ids = getBunkedEventIds();
  ids.add(eventId);
  localStorage.setItem(BUNKED_STORAGE_KEY, JSON.stringify([...ids]));
}
