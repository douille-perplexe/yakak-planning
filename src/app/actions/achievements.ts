"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createNotifications,
  getAllApprovedMemberIds,
} from "@/lib/notifications";
import { getTierEmoji } from "@/lib/achievement-utils";
import { AchievementTier } from "@/lib/types";

export async function setFeaturedBadge(achievementId: string | null) {
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

  // If setting a badge, verify the user has unlocked it
  if (achievementId) {
    const serviceClient = await createServiceClient();
    const { data: unlock } = await serviceClient
      .from("user_achievements")
      .select("id")
      .eq("user_id", profile.id)
      .eq("achievement_id", achievementId)
      .single();

    if (!unlock) return { success: false, error: "Achievement not unlocked" };
  }

  // Update via service client to bypass RLS on profiles update
  const serviceClient = await createServiceClient();
  const { error } = await serviceClient
    .from("profiles")
    .update({ featured_badge_id: achievementId })
    .eq("id", profile.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true };
}

export async function adminGrantAchievement(
  targetUserId: string,
  achievementId: string
) {
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
    return { success: false, error: "Not authorized" };
  }

  const serviceClient = await createServiceClient();

  // Get achievement definition for notification
  const { data: achievement } = await serviceClient
    .from("achievement_definitions")
    .select("id, name, tier")
    .eq("id", achievementId)
    .single();

  if (!achievement) return { success: false, error: "Achievement not found" };

  // Get target user name
  const { data: targetProfile } = await serviceClient
    .from("profiles")
    .select("display_name")
    .eq("id", targetUserId)
    .single();

  // Insert user_achievements
  const { error } = await serviceClient
    .from("user_achievements")
    .insert({
      user_id: targetUserId,
      achievement_id: achievementId,
      granted_by: profile.id,
    });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Already granted" };
    }
    return { success: false, error: error.message };
  }

  // Notify all members
  const displayName = targetProfile?.display_name ?? "Someone";
  const emoji = getTierEmoji(achievement.tier as AchievementTier);
  getAllApprovedMemberIds()
    .then((memberIds) =>
      createNotifications({
        type: "achievement_unlocked",
        referenceId: achievement.id,
        message: `${emoji} ${displayName} was awarded ${achievement.name} (${achievement.tier})!`,
        recipientIds: memberIds,
      })
    )
    .catch((err) => console.error("[achievement-notify]", err));

  revalidatePath("/settings");
  return { success: true };
}

export async function adminRevokeAchievement(
  targetUserId: string,
  achievementId: string
) {
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
    return { success: false, error: "Not authorized" };
  }

  const serviceClient = await createServiceClient();

  // Delete the achievement
  const { error } = await serviceClient
    .from("user_achievements")
    .delete()
    .eq("user_id", targetUserId)
    .eq("achievement_id", achievementId);

  if (error) return { success: false, error: error.message };

  // Clear featured_badge_id if it was this badge
  await serviceClient
    .from("profiles")
    .update({ featured_badge_id: null })
    .eq("id", targetUserId)
    .eq("featured_badge_id", achievementId);

  revalidatePath("/settings");
  return { success: true };
}
