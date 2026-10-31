import { uid } from "./utils";

export type Identity = {
  visitorId: string;
  firstSeen: string;
  lastSeen: string;
  visits: number;
  sessionId: string;
  sessionStarted: string;
  referrer: string;
  landingPath: string;
  utm: Record<string, string>;
  device: "mobile" | "tablet" | "desktop";
  viewport: string;
  language: string;
  timezone: string;
};

const IDENTITY_KEY = "openrole.visitor.v2";
const SESSION_WINDOW_MS = 30 * 60 * 1000;

function detectDevice(): Identity["device"] {
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function readUtm(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref"].forEach((key) => {
    const value = params.get(key);
    if (value) out[key] = value.slice(0, 80);
  });
  return out;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

let cached: Identity | null = null;

export function getIdentity(): Identity {
  if (cached) return cached;
  let existing: Identity | null = null;
  try {
    existing = safeParse<Identity>(localStorage.getItem(IDENTITY_KEY));
  } catch {
    existing = null;
  }

  const now = new Date();
  const nowISO = now.toISOString();
  const freshSession =
    !existing || now.getTime() - new Date(existing.lastSeen).getTime() > SESSION_WINDOW_MS;

  const identity: Identity = existing
    ? {
        ...existing,
        lastSeen: nowISO,
        visits: freshSession ? existing.visits + 1 : existing.visits,
        sessionId: freshSession ? uid("sess") : existing.sessionId,
        sessionStarted: freshSession ? nowISO : existing.sessionStarted,
        viewport: `${window.innerWidth}×${window.innerHeight}`,
      }
    : {
        visitorId: uid("anon"),
        firstSeen: nowISO,
        lastSeen: nowISO,
        visits: 1,
        sessionId: uid("sess"),
        sessionStarted: nowISO,
        referrer: document.referrer ? new URL(document.referrer).hostname : "direct",
        landingPath: window.location.hash || "#/",
        utm: readUtm(),
        device: detectDevice(),
        viewport: `${window.innerWidth}×${window.innerHeight}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

  cached = identity;
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } catch {
    /* storage might be unavailable — the app still works this session */
  }
  return identity;
}

export function refreshIdentity(patch: Partial<Identity>): Identity {
  const current = getIdentity();
  cached = { ...current, ...patch };
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(cached));
  } catch {
    /* ignore */
  }
  return cached;
}

export function resetIdentity(): void {
  cached = null;
  try {
    localStorage.removeItem(IDENTITY_KEY);
  } catch {
    /* ignore */
  }
}

export function updateLastSeen(): void {
  refreshIdentity({ lastSeen: new Date().toISOString() });
}

export function accountAgeDays(identity: Identity): number {
  return Math.max(
    0,
    Math.round((Date.now() - new Date(identity.firstSeen).getTime()) / 86400000)
  );
}

/**
 * Optional first-party analytics endpoint. Nothing is sent anywhere unless
 * VITE_TELEMETRY_URL is defined at build time — see README.
 */
export function sendTelemetry(
  name: string,
  props: Record<string, string | number | boolean> = {}
): void {
  const endpoint = import.meta.env.VITE_TELEMETRY_URL as string | undefined;
  if (!endpoint) return;
  const identity = getIdentity();
  const payload = JSON.stringify({
    id: identity.visitorId,
    session: identity.sessionId,
    name,
    props,
    at: new Date().toISOString(),
    path: window.location.hash,
  });
  try {
    if ("sendBeacon" in navigator) {
      navigator.sendBeacon(endpoint, new Blob([payload], { type: "application/json" }));
    } else {
      void fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }
  } catch {
    /* analytics must never break the product */
  }
}

export function telemetryEnabled(): boolean {
  return Boolean(import.meta.env.VITE_TELEMETRY_URL);
}
