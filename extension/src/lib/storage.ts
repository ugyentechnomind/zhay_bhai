export interface ExtensionSettings {
  apiBaseUrl: string;
  token: string | null;
}

const DEFAULTS: ExtensionSettings = {
  apiBaseUrl: "http://localhost:3000",
  token: null,
};

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.sync.get(DEFAULTS as unknown as Record<string, unknown>);
  return stored as unknown as ExtensionSettings;
}

export async function setSettings(patch: Partial<ExtensionSettings>): Promise<void> {
  await chrome.storage.sync.set(patch);
}

/** Local (non-synced) cache of the last-fetched event window, used by the
 * content script to fuzzy-match an event when it can't resolve a precise ID. */
export async function cacheEvents(events: unknown[]): Promise<void> {
  await chrome.storage.local.set({ cachedEvents: events, cachedEventsAt: Date.now() });
}

export async function getCachedEvents<T = unknown>(): Promise<T[]> {
  const { cachedEvents } = await chrome.storage.local.get("cachedEvents");
  return (cachedEvents as T[]) ?? [];
}
