"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  refreshStravaToken,
  getAthleteActivities,
  getStravaActivity,
  createStravaActivity,
  parseStravaActivityId,
  type StravaActivity,
} from "@/lib/strava";
import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StravaActivityLinkWithUser {
  id: string;
  event_id: string;
  user_id: string;
  strava_activity_id: number;
  activity_name: string;
  sport_type: string;
  start_date: string;
  elapsed_time: number;
  distance: number | null;
  total_elevation_gain: number | null;
  average_speed: number | null;
  created_at: string;
  user: { display_name: string; avatar_url: string };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function getValidToken(
  supabase: SupabaseClient,
  profileId: string
): Promise<string | null> {
  const { data: token } = await supabase
    .from("strava_tokens")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", profileId)
    .single();

  if (!token) return null;

  const expiresAt = new Date(token.token_expires_at).getTime();
  // Return current token if it has more than 60s left
  if (Date.now() < expiresAt - 60_000) {
    return token.access_token;
  }

  // Refresh
  try {
    const refreshed = await refreshStravaToken(token.refresh_token);
    await supabase
      .from("strava_tokens")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        token_expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", profileId);
    return refreshed.access_token;
  } catch {
    return null;
  }
}

async function getCurrentProfile(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  return profile ?? null;
}

async function storeActivityLink(
  supabase: SupabaseClient,
  eventId: string,
  profileId: string,
  activity: StravaActivity
) {
  const { error } = await supabase.from("strava_activity_links").upsert(
    {
      event_id: eventId,
      user_id: profileId,
      strava_activity_id: activity.id,
      activity_name: activity.name,
      sport_type: activity.sport_type,
      start_date: activity.start_date,
      elapsed_time: activity.elapsed_time,
      distance: activity.distance > 0 ? activity.distance : null,
      total_elevation_gain:
        activity.total_elevation_gain > 0 ? activity.total_elevation_gain : null,
      average_speed: activity.average_speed > 0 ? activity.average_speed : null,
    },
    { onConflict: "event_id,user_id" }
  );
  return error;
}

// ─── Public actions ───────────────────────────────────────────────────────────

export async function disconnectStravaAction() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("strava_tokens")
    .delete()
    .eq("user_id", profile.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function getMyStravaActivitiesAction(): Promise<{
  activities: StravaActivity[];
  error?: string;
}> {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return { activities: [], error: "Not authenticated" };

  const accessToken = await getValidToken(supabase, profile.id);
  if (!accessToken) return { activities: [], error: "Strava not connected" };

  try {
    const activities = await getAthleteActivities(accessToken, 20);
    return { activities };
  } catch (err) {
    console.error("[strava] getMyActivities", err);
    return { activities: [], error: "Failed to fetch Strava activities" };
  }
}

export async function linkStravaActivityAction(
  eventId: string,
  stravaActivityId: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return { success: false, error: "Not authenticated" };

  const accessToken = await getValidToken(supabase, profile.id);
  if (!accessToken) return { success: false, error: "Strava not connected" };

  try {
    const activity = await getStravaActivity(accessToken, stravaActivityId);
    const error = await storeActivityLink(supabase, eventId, profile.id, activity);
    if (error) return { success: false, error: error.message };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: msg };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function linkStravaActivityByUrlAction(
  eventId: string,
  urlOrId: string
): Promise<{ success: boolean; error?: string }> {
  const activityId = parseStravaActivityId(urlOrId);
  if (!activityId) {
    return { success: false, error: "Invalid Strava activity URL or ID" };
  }
  return linkStravaActivityAction(eventId, activityId);
}

export async function unlinkStravaActivityAction(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("strava_activity_links")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", profile.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function logEventToStravaAction(
  eventId: string,
  sportType: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return { success: false, error: "Not authenticated" };

  const accessToken = await getValidToken(supabase, profile.id);
  if (!accessToken) return { success: false, error: "Strava not connected" };

  // Fetch event details
  const { data: event } = await supabase
    .from("events")
    .select("title, date, duration_minutes, description")
    .eq("id", eventId)
    .single();

  if (!event) return { success: false, error: "Event not found" };

  try {
    const activity = await createStravaActivity(accessToken, {
      name: event.title,
      sport_type: sportType,
      start_date_local: event.date,
      elapsed_time: event.duration_minutes * 60,
      description: event.description ?? undefined,
    });
    const error = await storeActivityLink(supabase, eventId, profile.id, activity);
    if (error) return { success: false, error: error.message };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: msg };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function getEventStravaLinksAction(
  eventId: string
): Promise<StravaActivityLinkWithUser[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("strava_activity_links")
    .select("*, user:profiles!strava_activity_links_user_id_fkey(display_name, avatar_url)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  return (data ?? []) as unknown as StravaActivityLinkWithUser[];
}
