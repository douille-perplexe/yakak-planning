"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createNotifications, getAllApprovedMemberIds } from "@/lib/notifications";
import { fetchRandomMovies, fetchRandomTVShows, fetchRandomAnime, searchTMDB } from "@/lib/tmdb";
import { fetchRandomGames, searchGames } from "@/lib/rawg";
import { fetchFeaturedPlaylists, searchPlaylists } from "@/lib/spotify-search";
import { fetchRandomBooks, searchBooks } from "@/lib/google-books";
import type {
  RecommendationCategory,
  RecommendationSource,
  ApiRecommendation,
  RecommendationWithUser,
  SavedRecommendation,
} from "@/lib/types";

// ─── Helpers ─────────────────────────────────────────────

async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("user_id", user.id)
    .single();

  return profile;
}

// ─── Discover (ephemeral API results) ────────────────────

export async function getRandomRecommendations(
  category: RecommendationCategory | "All",
  count: number = 3
): Promise<{ recommendations: ApiRecommendation[]; error?: string }> {
  try {
    let results: ApiRecommendation[] = [];

    if (category === "All") {
      // Pick randomly across available API sources
      const fetchers = [
        () => fetchRandomMovies(count),
        () => fetchRandomTVShows(count),
        () => fetchRandomGames(count),
        () => fetchFeaturedPlaylists(count),
        () => fetchRandomBooks(count),
      ];
      const randomFetcher = fetchers[Math.floor(Math.random() * fetchers.length)];
      results = await randomFetcher();
    } else {
      switch (category) {
        case "Movies":
          results = await fetchRandomMovies(count);
          break;
        case "TV Series":
          results = await fetchRandomTVShows(count);
          break;
        case "Anime":
          results = await fetchRandomAnime(count);
          break;
        case "Games":
          results = await fetchRandomGames(count);
          break;
        case "Music":
          results = await fetchFeaturedPlaylists(count);
          break;
        case "Books":
          results = await fetchRandomBooks(count);
          break;
        default:
          return { recommendations: [], error: "No API source available for this category. Try submitting your own!" };
      }
    }

    return { recommendations: results };
  } catch (err) {
    console.error("[getRandomRecommendations]", err);
    return {
      recommendations: [],
      error: "Failed to fetch recommendations. Please try again.",
    };
  }
}

// ─── Search APIs (for submission flow) ───────────────────

export async function searchApiRecommendations(
  query: string,
  category: RecommendationCategory
): Promise<{ results: ApiRecommendation[]; error?: string }> {
  if (!query.trim()) return { results: [] };

  try {
    let results: ApiRecommendation[] = [];

    switch (category) {
      case "Movies":
        results = await searchTMDB(query, "movie");
        break;
      case "TV Series":
      case "Anime":
        results = await searchTMDB(query, "tv");
        break;
      case "Games":
        results = await searchGames(query);
        break;
      case "Music":
        results = await searchPlaylists(query);
        break;
      case "Books":
        results = await searchBooks(query);
        break;
      default:
        return { results: [], error: "No search available for this category" };
    }

    return { results };
  } catch (err) {
    console.error("[searchApiRecommendations]", err);
    return { results: [], error: "Search failed. Please try again." };
  }
}

// ─── User Recommendations (CRUD) ────────────────────────

export async function submitUserRecommendation(input: {
  title: string;
  description?: string;
  category: RecommendationCategory;
  external_url?: string;
  image_url?: string;
  source?: RecommendationSource;
  source_id?: string;
}) {
  if (!input.title?.trim()) {
    return { success: false, error: "Title is required" };
  }

  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("recommendations")
    .insert({
      user_id: profile.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      external_url: input.external_url?.trim() || null,
      image_url: input.image_url || null,
      source: input.source || "manual",
      source_id: input.source_id || null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  // Fire-and-forget notification
  const message = `🎯 ${profile.display_name} recommended "${input.title.trim()}"`;
  getAllApprovedMemberIds()
    .then((memberIds) =>
      createNotifications({
        type: "new_recommendation",
        referenceId: data.id,
        message,
        recipientIds: memberIds,
        excludeUserId: profile.id,
      })
    )
    .catch((err) => console.error("[new-recommendation-notification]", err));

  revalidatePath("/recommendations");
  revalidatePath("/");
  return { success: true };
}

export async function getUserRecommendations(
  sortBy: "recent" | "likes" = "recent",
  filterCategory?: RecommendationCategory
): Promise<RecommendationWithUser[]> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return [];

  let query = supabase
    .from("recommendations")
    .select(`
      *,
      user:profiles!recommendations_user_id_fkey(id, display_name, avatar_url),
      recommendation_likes(user_id)
    `);

  if (filterCategory) {
    query = query.eq("category", filterCategory);
  }

  if (sortBy === "recent") {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getUserRecommendations]", error);
    return [];
  }

  // Get saved IDs for current user
  const { data: savedItems } = await supabase
    .from("saved_recommendations")
    .select("recommendation_id")
    .eq("user_id", profile.id)
    .not("recommendation_id", "is", null);

  const savedRecIds = new Set(
    (savedItems ?? []).map((s: { recommendation_id: string }) => s.recommendation_id)
  );

  const mapped = (data ?? []).map((rec: Record<string, unknown>) => {
    const likes = (rec.recommendation_likes as { user_id: string }[]) ?? [];
    return {
      id: rec.id,
      user_id: rec.user_id,
      title: rec.title,
      description: rec.description,
      category: rec.category,
      external_url: rec.external_url,
      image_url: rec.image_url,
      source: rec.source,
      source_id: rec.source_id,
      created_at: rec.created_at,
      user: rec.user as { id: string; display_name: string; avatar_url: string },
      likes_count: likes.length,
      liked_by_me: likes.some((l) => l.user_id === profile.id),
      saved_by_me: savedRecIds.has(rec.id as string),
    } as RecommendationWithUser;
  });

  if (sortBy === "likes") {
    mapped.sort((a, b) => b.likes_count - a.likes_count);
  }

  return mapped;
}

// ─── Likes ───────────────────────────────────────────────

export async function toggleLike(recommendationId: string) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return { success: false, error: "Not authenticated" };

  // Check if already liked
  const { data: existing } = await supabase
    .from("recommendation_likes")
    .select("id")
    .eq("recommendation_id", recommendationId)
    .eq("user_id", profile.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("recommendation_likes")
      .delete()
      .eq("id", existing.id);

    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from("recommendation_likes").insert({
      recommendation_id: recommendationId,
      user_id: profile.id,
    });

    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/recommendations");
  return { success: true, liked: !existing };
}

// ─── Saved ───────────────────────────────────────────────

export async function saveRecommendation(data: {
  title: string;
  description?: string | null;
  category: RecommendationCategory;
  image_url?: string | null;
  external_url?: string | null;
  source: RecommendationSource;
  source_id?: string | null;
  recommendation_id?: string | null;
}) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return { success: false, error: "Not authenticated" };

  const { error } = await supabase.from("saved_recommendations").insert({
    user_id: profile.id,
    title: data.title,
    description: data.description || null,
    category: data.category,
    image_url: data.image_url || null,
    external_url: data.external_url || null,
    source: data.source,
    source_id: data.source_id || null,
    recommendation_id: data.recommendation_id || null,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/recommendations");
  return { success: true };
}

export async function removeSavedRecommendation(savedId: string) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("saved_recommendations")
    .delete()
    .eq("id", savedId)
    .eq("user_id", profile.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/recommendations");
  return { success: true };
}

export async function getSavedRecommendations(): Promise<SavedRecommendation[]> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return [];

  const { data, error } = await supabase
    .from("saved_recommendations")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getSavedRecommendations]", error);
    return [];
  }

  return (data ?? []) as SavedRecommendation[];
}
