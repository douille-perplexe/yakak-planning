"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateTwitchChannel } from "@/lib/twitch";

export async function addTwitchChannel(channelName: string) {
  const name = channelName?.trim().toLowerCase();
  if (!name || name.length > 25) {
    return { success: false, error: "Channel name is required (max 25 characters)" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { success: false, error: "Admin access required" };
  }

  // Validate channel exists on Twitch
  let twitchUser;
  try {
    twitchUser = await validateTwitchChannel(name);
  } catch {
    return { success: false, error: "Failed to validate channel with Twitch API" };
  }

  if (!twitchUser) {
    return { success: false, error: "Twitch channel not found" };
  }

  const { error } = await supabase.from("twitch_channels").insert({
    channel_name: twitchUser.login,
    twitch_user_id: twitchUser.id,
    display_name: twitchUser.display_name,
    profile_image_url: twitchUser.profile_image_url,
    description: twitchUser.description,
    broadcaster_type: twitchUser.broadcaster_type,
    added_by: profile.id,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "This channel is already being monitored" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true };
}

export async function removeTwitchChannel(channelId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("twitch_channels")
    .delete()
    .eq("id", channelId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true };
}

export async function toggleAutoEvents(channelId: string, enabled: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("twitch_channels")
    .update({ auto_create_events: enabled })
    .eq("id", channelId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}
