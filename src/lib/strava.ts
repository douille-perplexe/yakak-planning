export const STRAVA_SPORT_TYPES = [
  { value: "Run", label: "Run" },
  { value: "TrailRun", label: "Trail Run" },
  { value: "Walk", label: "Walk" },
  { value: "Hike", label: "Hike" },
  { value: "Ride", label: "Ride" },
  { value: "MountainBikeRide", label: "Mountain Bike" },
  { value: "GravelRide", label: "Gravel Ride" },
  { value: "Swim", label: "Swim" },
  { value: "Kayaking", label: "Kayaking" },
  { value: "Rowing", label: "Rowing" },
  { value: "WeightTraining", label: "Weight Training" },
  { value: "Yoga", label: "Yoga" },
  { value: "Workout", label: "Workout" },
  { value: "HighIntensityIntervalTraining", label: "HIIT" },
  { value: "Soccer", label: "Soccer" },
  { value: "Tennis", label: "Tennis" },
  { value: "Badminton", label: "Badminton" },
  { value: "TableTennis", label: "Table Tennis" },
] as const;

export type StravaSportType = (typeof STRAVA_SPORT_TYPES)[number]["value"];

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp (seconds)
  athlete: {
    id: number;
    username: string | null;
    firstname: string;
    lastname: string;
  };
}

export interface StravaRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  start_date: string; // ISO
  elapsed_time: number; // seconds
  distance: number; // meters (0 if not applicable)
  total_elevation_gain: number; // meters
  average_speed: number; // m/s
}

const BASE = "https://www.strava.com";

export function buildStravaAuthUrl(): string {
  const clientId = process.env.STRAVA_CLIENT_ID ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/strava/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all,activity:write",
  });
  return `${BASE}/oauth/authorize?${params}`;
}

export async function exchangeCodeForTokens(code: string): Promise<StravaTokenResponse> {
  const res = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava token exchange failed: ${text}`);
  }
  return res.json();
}

export async function refreshStravaToken(refreshToken: string): Promise<StravaRefreshResponse> {
  const res = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava token refresh failed: ${text}`);
  }
  return res.json();
}

export async function getAthleteActivities(
  accessToken: string,
  perPage = 20
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({ per_page: String(perPage) });
  const res = await fetch(`${BASE}/api/v3/athlete/activities?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Strava activities");
  return res.json();
}

export async function getStravaActivity(
  accessToken: string,
  activityId: number
): Promise<StravaActivity> {
  const res = await fetch(`${BASE}/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Strava activity ${activityId} not found`);
  return res.json();
}

export async function createStravaActivity(
  accessToken: string,
  data: {
    name: string;
    sport_type: string;
    start_date_local: string; // ISO string
    elapsed_time: number; // seconds
    description?: string;
  }
): Promise<StravaActivity> {
  const res = await fetch(`${BASE}/api/v3/activities`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create Strava activity: ${text}`);
  }
  return res.json();
}

/** Parse a Strava activity ID from a URL like https://www.strava.com/activities/12345678 or a bare number */
export function parseStravaActivityId(input: string): number | null {
  const trimmed = input.trim();
  // Bare number
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  // URL pattern
  const match = trimmed.match(/strava\.com\/activities\/(\d+)/);
  if (match) return parseInt(match[1], 10);
  return null;
}

/** Format elapsed seconds to e.g. "1h 23m" or "45m" */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

/** Format meters to e.g. "5.2 km" or "450 m" */
export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

/** Format m/s to pace string e.g. "5:30 /km" for running */
export function formatPace(metersPerSecond: number): string {
  if (!metersPerSecond || metersPerSecond <= 0) return "";
  const secsPerKm = 1000 / metersPerSecond;
  const m = Math.floor(secsPerKm / 60);
  const s = Math.round(secsPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

/** Format m/s to speed string e.g. "22.5 km/h" for cycling */
export function formatSpeed(metersPerSecond: number): string {
  if (!metersPerSecond || metersPerSecond <= 0) return "";
  return `${(metersPerSecond * 3.6).toFixed(1)} km/h`;
}

const SPEED_SPORT_TYPES = new Set(["Ride", "MountainBikeRide", "GravelRide", "EBikeRide", "Kayaking", "Rowing"]);

export function formatActivitySpeed(metersPerSecond: number, sportType: string): string {
  if (!metersPerSecond || metersPerSecond <= 0) return "";
  return SPEED_SPORT_TYPES.has(sportType)
    ? formatSpeed(metersPerSecond)
    : formatPace(metersPerSecond);
}
