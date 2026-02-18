"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  registerDevice,
  loginUser,
  fetchMyPoops,
  fetchFeed,
  createPoop,
  fetchMapFriendsAndMe,
} from "@/lib/poopmap";
import type { MapBounds } from "@/lib/poopmap";
import type { PoopMapPoop } from "@/lib/types";
import { checkAndGrantAchievements } from "@/lib/achievements";
import { createNotifications, getAllApprovedMemberIds } from "@/lib/notifications";

export async function linkPoopMapAccount(email: string, password: string) {
  if (!email?.trim() || !password) {
    return { success: false, error: "Email and password are required" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) return { success: false, error: "Profile not found" };

  // Register a device and authenticate with Poop Map
  let device;
  try {
    device = await registerDevice();
  } catch {
    return { success: false, error: "Failed to register device with Poop Map" };
  }

  let poopMapUser;
  try {
    poopMapUser = await loginUser(device.token, {
      email: email.trim(),
      password,
    });
  } catch {
    return { success: false, error: "Invalid Poop Map credentials" };
  }

  const { error } = await supabase.from("poopmap_tokens").upsert(
    {
      user_id: profile.id,
      device_token: device.token,
      poopmap_username: poopMapUser.username,
      poopmap_user_id: poopMapUser.id,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/poop-map");
  revalidatePath("/");
  return { success: true };
}

export async function unlinkPoopMapAccount() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) return { success: false, error: "Profile not found" };

  const { error } = await supabase
    .from("poopmap_tokens")
    .delete()
    .eq("user_id", profile.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/poop-map");
  revalidatePath("/");
  return { success: true };
}

export async function addPoop(data: {
  latitude: number;
  longitude: number;
  note?: string;
  place?: string;
  rating?: number;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("user_id", user.id)
    .single();

  if (!profile) return { success: false, error: "Profile not found" };

  const { data: token } = await supabase
    .from("poopmap_tokens")
    .select("device_token")
    .eq("user_id", profile.id)
    .single();

  if (!token) {
    return { success: false, error: "Poop Map account not linked" };
  }

  try {
    await createPoop(token.device_token, data);
  } catch {
    return { success: false, error: "Failed to add poop via Poop Map API" };
  }

  checkAndGrantAchievements(profile.id, [
    "poop_veteran",
    "poop_rater",
    "poop_explorer",
    "poop_streak",
  ]).catch((err) => console.error("[poop-achievements]", err));

  // Notify all approved members about the new poop
  const message = data.place
    ? `💩 ${profile.display_name} just logged a poop at ${data.place}!`
    : `💩 ${profile.display_name} just logged a poop!`;

  getAllApprovedMemberIds()
    .then((memberIds) =>
      createNotifications({
        type: "new_poop",
        referenceId: profile.id,
        message,
        recipientIds: memberIds,
        excludeUserId: profile.id,
      })
    )
    .catch((err) => console.error("[new-poop-notification]", err));

  revalidatePath("/poop-map");
  revalidatePath("/");
  return { success: true };
}

export async function getMapPoops(
  bounds: MapBounds
): Promise<{ poops: PoopMapPoop[] }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { poops: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) return { poops: [] };

  const { data: token } = await supabase
    .from("poopmap_tokens")
    .select("device_token")
    .eq("user_id", profile.id)
    .single();

  if (!token) return { poops: [] };

  try {
    const poops = await fetchMapFriendsAndMe(token.device_token, bounds);
    return { poops };
  } catch {
    return { poops: [] };
  }
}

export async function getMyPoops(): Promise<{
  poops: PoopMapPoop[];
  linked: boolean;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { poops: [], linked: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) return { poops: [], linked: false };

  const { data: token } = await supabase
    .from("poopmap_tokens")
    .select("device_token")
    .eq("user_id", profile.id)
    .single();

  if (!token) return { poops: [], linked: false };

  try {
    const poops = await fetchMyPoops(token.device_token);
    return { poops, linked: true };
  } catch {
    return { poops: [], linked: true };
  }
}

export async function getFeed(): Promise<{
  poops: PoopMapPoop[];
  linked: boolean;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { poops: [], linked: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) return { poops: [], linked: false };

  const { data: token } = await supabase
    .from("poopmap_tokens")
    .select("device_token")
    .eq("user_id", profile.id)
    .single();

  if (!token) return { poops: [], linked: false };

  try {
    const poops = await fetchFeed(token.device_token);
    return { poops, linked: true };
  } catch {
    return { poops: [], linked: true };
  }
}
