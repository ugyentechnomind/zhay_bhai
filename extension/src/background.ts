import { bunkMeeting, fetchEvents } from "./lib/api";
import { cacheEvents } from "./lib/storage";

/**
 * Central place for all backend calls. The content script (running inside
 * calendar.google.com) messages this service worker rather than calling
 * fetch() directly, so we never have to worry about the host page's CSP.
 */

export type BackgroundRequest =
  | { type: "FETCH_EVENTS" }
  | { type: "BUNK_MEETING"; eventId: string; tone: import("@zhay-bhai/shared").ExcuseTone; autoSend?: boolean };

export type BackgroundResponse =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

chrome.runtime.onMessage.addListener((message: BackgroundRequest, _sender, sendResponse) => {
  handle(message)
    .then((data) => sendResponse({ ok: true, data } satisfies BackgroundResponse))
    .catch((err) =>
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      } satisfies BackgroundResponse),
    );
  return true; // keep the message channel open for the async response above
});

async function handle(message: BackgroundRequest): Promise<unknown> {
  switch (message.type) {
    case "FETCH_EVENTS": {
      const events = await fetchEvents();
      await cacheEvents(events);
      return events;
    }
    case "BUNK_MEETING":
      return bunkMeeting(message.eventId, message.tone, message.autoSend ?? true);
    default:
      throw new Error(`Unknown message type: ${(message as { type: string }).type}`);
  }
}

// Keep the local event cache reasonably fresh so the content script's
// fuzzy-match fallback (see content-script.ts) has recent data even if the
// popup hasn't been opened in a while.
chrome.alarms?.create("refresh-events", { periodInMinutes: 30 });
chrome.alarms?.onAlarm.addListener((alarm) => {
  if (alarm.name === "refresh-events") {
    fetchEvents().then(cacheEvents).catch(() => {});
  }
});
