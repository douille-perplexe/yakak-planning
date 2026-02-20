import type { ApiRecommendation } from "@/lib/types";

// iTunes Search API and RSS — no API key required
const SEARCH_API = "https://itunes.apple.com/search";
const RSS_BASE = "https://itunes.apple.com/us/rss/topsongs/limit=100";

const GENRE_IDS = [
  { id: 14, name: "Pop" },
  { id: 21, name: "Rock" },
  { id: 18, name: "Hip-Hop/Rap" },
  { id: 11, name: "Jazz" },
  { id: 5,  name: "Classical" },
  { id: 6,  name: "Country" },
  { id: 20, name: "Alternative" },
  { id: 15, name: "R&B/Soul" },
  { id: 7,  name: "Electronic" },
  { id: 2,  name: "Blues" },
  { id: 12, name: "Latin" },
  { id: 17, name: "Dance" },
];

interface ItunesRssImage {
  label: string;
  attributes: { height: string };
}

interface ItunesRssEntry {
  "im:name": { label: string };
  "im:artist": { label: string };
  "im:image": ItunesRssImage[];
  link: { attributes: { href: string } };
  id: { attributes: { "im:id": string } };
}

interface ItunesSong {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
}

interface ItunesSearchResponse {
  resultCount: number;
  results: ItunesSong[];
}

function bestRssImage(images: ItunesRssImage[]): string | null {
  if (!images?.length) return null;
  const largest = images.reduce((best, img) =>
    parseInt(img.attributes.height) > parseInt(best.attributes.height) ? img : best
  );
  // Upscale the thumbnail to 600x600
  return largest.label.replace(/\d+x\d+bb/, "600x600bb") || null;
}

export async function fetchTopTracks(count: number = 3): Promise<ApiRecommendation[]> {
  const genre = GENRE_IDS[Math.floor(Math.random() * GENRE_IDS.length)];
  const res = await fetch(`${RSS_BASE}/genre=${genre.id}/json`, { cache: "no-store" });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`iTunes RSS fetch failed: ${res.status} - ${body}`);
  }

  const data = await res.json();
  const entries = (data.feed?.entry ?? []) as ItunesRssEntry[];
  const shuffled = entries.sort(() => Math.random() - 0.5).slice(0, count);

  return shuffled.map((e) => ({
    title: `${e["im:artist"].label} – ${e["im:name"].label}`,
    description: null,
    category: "Music" as const,
    image_url: bestRssImage(e["im:image"]),
    external_url: e.link?.attributes?.href ?? null,
    // stored as "spotify" to match the existing DB CHECK constraint
    source: "spotify" as const,
    source_id: `itunes-${e.id?.attributes?.["im:id"]}`,
  }));
}

export async function searchTracks(query: string): Promise<ApiRecommendation[]> {
  const params = new URLSearchParams({
    term: query,
    media: "music",
    entity: "song",
    limit: "10",
  });

  const res = await fetch(`${SEARCH_API}?${params}`, { cache: "no-store" });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`iTunes search failed: ${res.status} - ${body}`);
  }

  const data: ItunesSearchResponse = await res.json();

  return data.results.map((t) => ({
    title: `${t.artistName} – ${t.trackName}`,
    description: t.collectionName ?? null,
    category: "Music" as const,
    image_url: t.artworkUrl100?.replace("100x100bb", "600x600bb") ?? null,
    external_url: t.trackViewUrl ?? null,
    source: "spotify" as const,
    source_id: `itunes-${t.trackId}`,
  }));
}
