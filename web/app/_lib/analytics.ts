// lib: analytics - fire-and-forget event tracking to this site's own API
const TRACK_URL = "/api/track";

const ANON_KEY = "aleph_anon_id";

export type AnalyticsEventType = "visit" | "download" | "game_play";

export type DownloadPlatform = "windows" | "macos" | "linux";

export function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function trackEvent(
  eventType: AnalyticsEventType,
  platform?: string
): void {
  const params = new URLSearchParams({
    event_type: eventType,
    anon_id: getAnonId(),
  });
  if (platform) params.set("platform", platform);
  // keepalive so the request survives the navigation a download click causes
  fetch(`${TRACK_URL}?${params}`, { method: "POST", keepalive: true }).catch(
    () => {
      // analytics must never break the site
    }
  );
}
