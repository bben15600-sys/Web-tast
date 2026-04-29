import type { VercelRequest, VercelResponse } from "@vercel/node";

// Single function that handles all Strava OAuth flows. Routed via the
// dynamic [action] segment so URLs stay /api/strava/{auth,callback,
// activities,disconnect} — these match the Strava redirect URI and
// the cookie path. Consolidating into one file keeps us under Vercel's
// Hobby-tier 12-function deployment limit.

type StravaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname?: string; lastname?: string };
};

type StravaActivityRaw = {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  start_date_local: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  calories?: number;
  total_elevation_gain?: number;
};

type StravaTokenRefresh = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

const TYPE_TO_HEBREW: Record<string, string> = {
  Run: "ריצה",
  Ride: "אופניים",
  Walk: "הליכה",
  Swim: "שחייה",
  Workout: "כושר",
  WeightTraining: "כושר",
  Tennis: "טניס",
  Basketball: "כדורסל",
  Hike: "הליכה",
  Yoga: "יוגה",
};

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    out[part.slice(0, eq)] = decodeURIComponent(part.slice(eq + 1));
  }
  return out;
}

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

function cookieSecure(): string {
  return isProd() ? "; Secure" : "";
}

// Vercel's mobile UI sometimes appends a stray newline when pasting a long
// value (a known editor quirk). Stripping whitespace defensively here means
// the OAuth flow stays correct even if STRAVA_REDIRECT_URI ends with "\n".
function envTrim(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === "string" ? v.trim() : undefined;
}

// ── auth ────────────────────────────────────────────────────────────────────
function handleAuth(_req: VercelRequest, res: VercelResponse) {
  const clientId = envTrim("STRAVA_CLIENT_ID");
  const redirectUri = envTrim("STRAVA_REDIRECT_URI");
  if (!clientId || !redirectUri) {
    return res.status(500).json({
      error: "Strava OAuth not configured. Set STRAVA_CLIENT_ID and STRAVA_REDIRECT_URI.",
    });
  }
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  res.setHeader("Set-Cookie", [
    `strava_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${cookieSecure()}`,
  ]);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read",
    state,
  });
  return res.redirect(302, `https://www.strava.com/oauth/authorize?${params.toString()}`);
}

// ── callback ────────────────────────────────────────────────────────────────
async function handleCallback(req: VercelRequest, res: VercelResponse) {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const errorParam = typeof req.query.error === "string" ? req.query.error : "";

  if (errorParam) {
    return res.redirect(302, `/health?strava_error=${encodeURIComponent(errorParam)}`);
  }
  if (!code) return res.status(400).json({ error: "Missing authorization code" });

  const cookies = parseCookies(req.headers.cookie);
  if (!cookies.strava_oauth_state || cookies.strava_oauth_state !== state) {
    return res.status(400).json({ error: "Invalid OAuth state — possible CSRF" });
  }

  const clientId = envTrim("STRAVA_CLIENT_ID");
  const clientSecret = envTrim("STRAVA_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "Strava OAuth not configured" });
  }

  try {
    const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      return res.status(502).json({ error: `Strava token exchange failed: ${text.slice(0, 200)}` });
    }
    const tokens = (await tokenResponse.json()) as StravaTokenResponse;
    if (!tokens.access_token || !tokens.refresh_token) {
      return res.status(502).json({ error: "Strava response missing tokens" });
    }
    const flags = `Path=/; HttpOnly; SameSite=Lax${cookieSecure()}`;
    res.setHeader("Set-Cookie", [
      `strava_access=${tokens.access_token}; ${flags}; Max-Age=21600`,
      `strava_refresh=${tokens.refresh_token}; ${flags}; Max-Age=${30 * 86400}`,
      `strava_expires_at=${tokens.expires_at}; Path=/; SameSite=Lax${cookieSecure()}; Max-Age=${30 * 86400}`,
      `strava_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cookieSecure()}`,
    ]);
    return res.redirect(302, "/health?strava_connected=1");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: `Strava callback failed: ${msg}` });
  }
}

// ── activities ──────────────────────────────────────────────────────────────
async function refreshTokens(refreshToken: string): Promise<StravaTokenRefresh | null> {
  const clientId = envTrim("STRAVA_CLIENT_ID");
  const clientSecret = envTrim("STRAVA_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  try {
    const r = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!r.ok) return null;
    return (await r.json()) as StravaTokenRefresh;
  } catch {
    return null;
  }
}

async function handleActivities(req: VercelRequest, res: VercelResponse) {
  const cookies = parseCookies(req.headers.cookie);
  let accessToken = cookies.strava_access;
  const refreshToken = cookies.strava_refresh;
  const expiresAt = Number(cookies.strava_expires_at) || 0;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ error: "Not connected to Strava", connected: false });
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if ((!accessToken || expiresAt <= nowSec + 60) && refreshToken) {
    const refreshed = await refreshTokens(refreshToken);
    if (!refreshed) {
      return res.status(401).json({ error: "Failed to refresh Strava token", connected: false });
    }
    accessToken = refreshed.access_token;
    const flags = `Path=/; HttpOnly; SameSite=Lax${cookieSecure()}`;
    res.setHeader("Set-Cookie", [
      `strava_access=${refreshed.access_token}; ${flags}; Max-Age=21600`,
      `strava_refresh=${refreshed.refresh_token}; ${flags}; Max-Age=${30 * 86400}`,
      `strava_expires_at=${refreshed.expires_at}; Path=/; SameSite=Lax${cookieSecure()}; Max-Age=${30 * 86400}`,
    ]);
  }

  if (!accessToken) {
    return res.status(401).json({ error: "No Strava access token", connected: false });
  }

  const perPage = Math.min(Number(req.query.per_page) || 20, 50);
  const after = typeof req.query.after === "string" ? req.query.after : "";
  const params = new URLSearchParams({ per_page: String(perPage) });
  if (after) params.set("after", after);

  try {
    const r = await fetch(`https://www.strava.com/api/v3/athlete/activities?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: `Strava API error: ${text.slice(0, 200)}` });
    }
    const raw = (await r.json()) as StravaActivityRaw[];
    const activities = raw.map((a) => ({
      id: String(a.id),
      date: a.start_date_local.slice(0, 10),
      type: TYPE_TO_HEBREW[a.sport_type ?? a.type] ?? "אחר",
      title: a.name,
      durationMin: Math.round(a.moving_time / 60),
      kcal: Math.round(a.calories ?? 0),
      distance: a.distance,
      elevation: a.total_elevation_gain ?? 0,
      source: "strava" as const,
    }));
    res.setHeader("Cache-Control", "private, max-age=120");
    return res.status(200).json({ connected: true, activities });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: `Strava fetch failed: ${msg}` });
  }
}

// ── disconnect ──────────────────────────────────────────────────────────────
function handleDisconnect(_req: VercelRequest, res: VercelResponse) {
  const flags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cookieSecure()}`;
  res.setHeader("Set-Cookie", [
    `strava_access=; ${flags}`,
    `strava_refresh=; ${flags}`,
    `strava_expires_at=; Path=/; SameSite=Lax; Max-Age=0${cookieSecure()}`,
  ]);
  return res.status(200).json({ ok: true });
}

// ── router ──────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = typeof req.query.action === "string" ? req.query.action : "";

  switch (action) {
    case "auth":
      if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Method not allowed" });
      }
      return handleAuth(req, res);
    case "callback":
      if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Method not allowed" });
      }
      return handleCallback(req, res);
    case "activities":
      if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Method not allowed" });
      }
      return handleActivities(req, res);
    case "disconnect":
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
      }
      return handleDisconnect(req, res);
    default:
      return res.status(404).json({ error: `Unknown Strava action: ${action}` });
  }
}
