import type { ApiRecommendation } from "@/lib/types";

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

function apiKey() {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY is not configured");
  return key;
}

interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
}

interface TmdbTv {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
}

interface TmdbPageResponse<T> {
  results: T[];
  total_pages: number;
}

export async function fetchRandomMovies(
  count: number = 3
): Promise<ApiRecommendation[]> {
  const page = Math.floor(Math.random() * 50) + 1;
  const res = await fetch(
    `${BASE_URL}/movie/popular?api_key=${apiKey()}&page=${page}`,
    { next: { revalidate: 0 } }
  );

  if (!res.ok) throw new Error(`TMDB fetchRandomMovies failed: ${res.status}`);

  const data: TmdbPageResponse<TmdbMovie> = await res.json();
  const shuffled = data.results.sort(() => Math.random() - 0.5).slice(0, count);

  return shuffled.map((m) => ({
    title: m.title,
    description: m.overview,
    category: "Movies" as const,
    image_url: m.poster_path ? `${IMAGE_BASE}${m.poster_path}` : null,
    external_url: `https://www.themoviedb.org/movie/${m.id}`,
    source: "tmdb" as const,
    source_id: `movie-${m.id}`,
    rating: m.vote_average,
  }));
}

export async function fetchRandomTVShows(
  count: number = 3
): Promise<ApiRecommendation[]> {
  const page = Math.floor(Math.random() * 50) + 1;
  const res = await fetch(
    `${BASE_URL}/tv/popular?api_key=${apiKey()}&page=${page}`,
    { next: { revalidate: 0 } }
  );

  if (!res.ok) throw new Error(`TMDB fetchRandomTVShows failed: ${res.status}`);

  const data: TmdbPageResponse<TmdbTv> = await res.json();
  const shuffled = data.results.sort(() => Math.random() - 0.5).slice(0, count);

  return shuffled.map((t) => ({
    title: t.name,
    description: t.overview,
    category: "TV Series" as const,
    image_url: t.poster_path ? `${IMAGE_BASE}${t.poster_path}` : null,
    external_url: `https://www.themoviedb.org/tv/${t.id}`,
    source: "tmdb" as const,
    source_id: `tv-${t.id}`,
    rating: t.vote_average,
  }));
}

export async function fetchRandomAnime(
  count: number = 3
): Promise<ApiRecommendation[]> {
  const page = Math.floor(Math.random() * 20) + 1;
  const res = await fetch(
    `${BASE_URL}/tv/popular?api_key=${apiKey()}&with_genres=16&with_origin_country=JP&page=${page}`,
    { next: { revalidate: 0 } }
  );

  if (!res.ok) throw new Error(`TMDB fetchRandomAnime failed: ${res.status}`);

  const data: TmdbPageResponse<TmdbTv> = await res.json();
  const shuffled = data.results.sort(() => Math.random() - 0.5).slice(0, count);

  return shuffled.map((t) => ({
    title: t.name,
    description: t.overview,
    category: "Anime" as const,
    image_url: t.poster_path ? `${IMAGE_BASE}${t.poster_path}` : null,
    external_url: `https://www.themoviedb.org/tv/${t.id}`,
    source: "tmdb" as const,
    source_id: `anime-${t.id}`,
    rating: t.vote_average,
  }));
}

export async function searchTMDB(
  query: string,
  type: "movie" | "tv" = "movie"
): Promise<ApiRecommendation[]> {
  const res = await fetch(
    `${BASE_URL}/search/${type}?api_key=${apiKey()}&query=${encodeURIComponent(query)}`,
    { next: { revalidate: 0 } }
  );

  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`);

  if (type === "movie") {
    const data: TmdbPageResponse<TmdbMovie> = await res.json();
    return data.results.slice(0, 10).map((m) => ({
      title: m.title,
      description: m.overview,
      category: "Movies" as const,
      image_url: m.poster_path ? `${IMAGE_BASE}${m.poster_path}` : null,
      external_url: `https://www.themoviedb.org/movie/${m.id}`,
      source: "tmdb" as const,
      source_id: `movie-${m.id}`,
      rating: m.vote_average,
    }));
  }

  const data: TmdbPageResponse<TmdbTv> = await res.json();
  return data.results.slice(0, 10).map((t) => ({
    title: t.name,
    description: t.overview,
    category: "TV Series" as const,
    image_url: t.poster_path ? `${IMAGE_BASE}${t.poster_path}` : null,
    external_url: `https://www.themoviedb.org/tv/${t.id}`,
    source: "tmdb" as const,
    source_id: `tv-${t.id}`,
    rating: t.vote_average,
  }));
}
