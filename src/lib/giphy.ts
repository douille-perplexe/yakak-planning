export interface GifResult {
  id: string;
  title: string;
  preview_url: string; // images.fixed_height_small.url — for picker grid
  full_url: string;    // images.downsized.url — stored in image_url
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGif(gif: any): GifResult {
  return {
    id: gif.id,
    title: gif.title ?? "",
    preview_url: gif.images?.fixed_height_small?.url ?? gif.images?.downsized_small?.mp4 ?? "",
    full_url: gif.images?.downsized?.url ?? gif.images?.original?.url ?? "",
  };
}

export async function searchGifs(query: string, limit = 24): Promise<GifResult[]> {
  try {
    const params = new URLSearchParams({
      api_key: process.env.GIPHY_API_KEY ?? "",
      q: query,
      limit: String(limit),
      rating: "g",
    });
    const res = await fetch(`https://api.giphy.com/v1/gifs/search?${params}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.data ?? []).map((g: any) => mapGif(g));
  } catch {
    return [];
  }
}

export async function trendingGifs(limit = 24): Promise<GifResult[]> {
  try {
    const params = new URLSearchParams({
      api_key: process.env.GIPHY_API_KEY ?? "",
      limit: String(limit),
      rating: "g",
    });
    const res = await fetch(`https://api.giphy.com/v1/gifs/trending?${params}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.data ?? []).map((g: any) => mapGif(g));
  } catch {
    return [];
  }
}
