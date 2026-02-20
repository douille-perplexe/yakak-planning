import type { ApiRecommendation } from "@/lib/types";

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

let cachedToken: { token: string; expiresAt: number } | null = null;

function getCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are not configured");
  }
  return { clientId, clientSecret };
}

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const { clientId, clientSecret } = getCredentials();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`Spotify token request failed: ${res.status}`);

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.token;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  external_urls: { spotify: string };
}

interface SpotifyFeaturedResponse {
  playlists: { items: SpotifyPlaylist[] };
}

interface SpotifySearchResponse {
  playlists: { items: SpotifyPlaylist[] };
}

export async function fetchFeaturedPlaylists(
  count: number = 3
): Promise<ApiRecommendation[]> {
  const token = await getSpotifyToken();
  const offset = Math.floor(Math.random() * 30);
  const res = await fetch(
    `${API_BASE}/browse/featured-playlists?limit=20&offset=${offset}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) throw new Error(`Spotify fetchFeaturedPlaylists failed: ${res.status}`);

  const data: SpotifyFeaturedResponse = await res.json();
  const shuffled = data.playlists.items
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  return shuffled.map((p) => ({
    title: p.name,
    description: p.description || null,
    category: "Music" as const,
    image_url: p.images[0]?.url ?? null,
    external_url: p.external_urls.spotify,
    source: "spotify" as const,
    source_id: `playlist-${p.id}`,
  }));
}

export async function searchPlaylists(
  query: string
): Promise<ApiRecommendation[]> {
  const token = await getSpotifyToken();
  const res = await fetch(
    `${API_BASE}/search?type=playlist&q=${encodeURIComponent(query)}&limit=10`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) throw new Error(`Spotify searchPlaylists failed: ${res.status}`);

  const data: SpotifySearchResponse = await res.json();

  return data.playlists.items.map((p) => ({
    title: p.name,
    description: p.description || null,
    category: "Music" as const,
    image_url: p.images[0]?.url ?? null,
    external_url: p.external_urls.spotify,
    source: "spotify" as const,
    source_id: `playlist-${p.id}`,
  }));
}
