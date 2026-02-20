"use server";

import { GifResult, searchGifs, trendingGifs } from "@/lib/giphy";

export async function searchGifsAction(query: string): Promise<GifResult[]> {
  return searchGifs(query);
}

export async function getTrendingGifsAction(): Promise<GifResult[]> {
  return trendingGifs();
}
