import type { ApiRecommendation } from "@/lib/types";

const BASE_URL = "https://api.rawg.io/api";

function apiKey() {
  const key = process.env.RAWG_API_KEY;
  if (!key) throw new Error("RAWG_API_KEY is not configured");
  return key;
}

interface RawgGame {
  id: number;
  name: string;
  description_raw?: string;
  background_image: string | null;
  rating: number;
  slug: string;
}

interface RawgResponse {
  results: RawgGame[];
  count: number;
}

export async function fetchRandomGames(
  count: number = 3
): Promise<ApiRecommendation[]> {
  const page = Math.floor(Math.random() * 20) + 1;
  const res = await fetch(
    `${BASE_URL}/games?key=${apiKey()}&ordering=-rating&page=${page}&page_size=20`,
    { next: { revalidate: 0 } }
  );

  if (!res.ok) throw new Error(`RAWG fetchRandomGames failed: ${res.status}`);

  const data: RawgResponse = await res.json();
  const shuffled = data.results.sort(() => Math.random() - 0.5).slice(0, count);

  return shuffled.map((g) => ({
    title: g.name,
    description: g.description_raw?.slice(0, 300) ?? null,
    category: "Games" as const,
    image_url: g.background_image,
    external_url: `https://rawg.io/games/${g.slug}`,
    source: "rawg" as const,
    source_id: `game-${g.id}`,
    rating: g.rating,
  }));
}

export async function searchGames(
  query: string
): Promise<ApiRecommendation[]> {
  const res = await fetch(
    `${BASE_URL}/games?key=${apiKey()}&search=${encodeURIComponent(query)}&page_size=10`,
    { next: { revalidate: 0 } }
  );

  if (!res.ok) throw new Error(`RAWG searchGames failed: ${res.status}`);

  const data: RawgResponse = await res.json();

  return data.results.map((g) => ({
    title: g.name,
    description: g.description_raw?.slice(0, 300) ?? null,
    category: "Games" as const,
    image_url: g.background_image,
    external_url: `https://rawg.io/games/${g.slug}`,
    source: "rawg" as const,
    source_id: `game-${g.id}`,
    rating: g.rating,
  }));
}
