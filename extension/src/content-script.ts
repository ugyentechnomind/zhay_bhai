import type { ExcuseTone } from "@zhay-bhai/shared";
import { getCachedEvents } from "./lib/storage";

/**
 * Google Calendar has no public extension point for the RSVP (Yes/No/Maybe)
 * button row, and its DOM class names are minified/obfuscated and change
 * across releases. This script therefore uses the accessible-name (aria-label)
 * of the RSVP buttons - a much more stable anchor than class names - to find
 * the row, then injects a "Bunk" button next to it.
 *
 * Known limitation: resolving *which* synced event the user is looking at is
 * best-effort (see resolveEventId below). If Google changes this markup, only
 * this file should need updating - see MODULES.md for the extension point.
 */

const RSVP_LABELS = /^(yes|no|maybe|going\?|not going)$/i;
const PROCESSED_ATTR = "data-bunk-it-processed";

function findRsvpRow(root: ParentNode): HTMLElement | null {
  const candidates = Array.from(
    root.querySelectorAll<HTMLElement>('[role="button"][aria-label], button[aria-label]'),
  ).filter((el) => RSVP_LABELS.test(el.getAttribute("aria-label")?.trim() ?? ""));

  if (candidates.length === 0) return null;
  // The RSVP buttons are siblings - use the first match's parent as the row.
  return candidates[0].parentElement;
}

/** Extracts the Google event id from a "More details" / "Open event" link's `eid` param. */
function eventIdFromEidLink(root: ParentNode): string | null {
  const link = root.querySelector<HTMLAnchorElement>('a[href*="eid="]');
  if (!link) return null;
  try {
    const url = new URL(link.href);
    const eid = url.searchParams.get("eid");
    if (!eid) return null;
    const decoded = atob(eid.replace(/-/g, "+").replace(/_/g, "/"));
    return decoded.split(" ")[0] || null;
  } catch {
    return null;
  }
}

interface CachedEvent {
  id: string;
  googleEventId: string;
  title: string;
}

async function resolveEventId(popover: HTMLElement): Promise<string | null> {
  const googleEventId = eventIdFromEidLink(popover);
  const cached = await getCachedEvents<CachedEvent>();

  if (googleEventId) {
    const match = cached.find((e) => e.googleEventId === googleEventId);
    if (match) return match.id;
  }

  // Fallback: fuzzy-match on the popover's accessible name / heading text
  // against titles we already synced.
  const label =
    popover.getAttribute("aria-label") ??
    popover.querySelector("h1,h2,[role=heading]")?.textContent ??
    "";
  const normalized = label.toLowerCase();
  const fuzzy = cached.find((e) => normalized.includes(e.title.toLowerCase()));
  return fuzzy?.id ?? null;
}

function sendMessage<T>(message: object): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  return chrome.runtime.sendMessage(message);
}

function createBunkButton(onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Bunk 🙈";
  button.className = "bunk-it-button";
  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  return button;
}

function createToneMenu(popover: HTMLElement, onPick: (tone: ExcuseTone) => void): HTMLElement {
  const menu = document.createElement("div");
  menu.className = "bunk-it-menu";
  const tones: Array<{ tone: ExcuseTone; label: string }> = [
    { tone: "sick", label: "Feeling unwell" },
    { tone: "family_emergency", label: "Family emergency" },
    { tone: "transport", label: "Transport issue" },
    { tone: "work_conflict", label: "Work conflict" },
    { tone: "connectivity", label: "Connectivity issue" },
  ];
  for (const { tone, label } of tones) {
    const item = document.createElement("button");
    item.type = "button";
    item.textContent = label;
    item.className = "bunk-it-menu-item";
    item.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      menu.remove();
      onPick(tone);
    });
    menu.appendChild(item);
  }
  popover.appendChild(menu);
  return menu;
}

function showToast(popover: HTMLElement, text: string) {
  const toast = document.createElement("div");
  toast.className = "bunk-it-toast";
  toast.textContent = text;
  popover.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
}

async function handleBunkClick(popover: HTMLElement) {
  const eventId = await resolveEventId(popover);
  if (!eventId) {
    showToast(
      popover,
      "Bunk It couldn't identify this event automatically. Open the extension popup instead.",
    );
    return;
  }

  createToneMenu(popover, async (tone) => {
    showToast(popover, "Drafting your excuse…");
    const result = await sendMessage<{ subject: string; sent: boolean }>({
      type: "BUNK_MEETING",
      eventId,
      tone,
      autoSend: true,
    });
    if (result.ok) {
      showToast(popover, result.data.sent ? "Excuse sent ✅" : "Excuse drafted (not sent)");
    } else {
      showToast(popover, `Failed: ${result.error}`);
    }
  });
}

function injectInto(popover: HTMLElement) {
  if (popover.hasAttribute(PROCESSED_ATTR)) return;
  const row = findRsvpRow(popover);
  if (!row) return;

  popover.setAttribute(PROCESSED_ATTR, "true");
  const button = createBunkButton(() => handleBunkClick(popover));
  row.appendChild(button);
}

function scan() {
  // Google Calendar renders the RSVP row inside dialog/popover containers.
  // We scan broadly (role=dialog, and generic event popover containers) since
  // there is no single stable selector for "the event detail popover".
  document.querySelectorAll<HTMLElement>('[role="dialog"]').forEach(injectInto);
}

const observer = new MutationObserver(() => scan());
observer.observe(document.body, { childList: true, subtree: true });
scan();
