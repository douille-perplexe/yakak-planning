"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleReaction(
  commentId: string,
  emoji: string,
  eventId: string
) {
  if (!emoji || emoji.length > 32) {
    return { success: false, error: "Invalid emoji" };
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

  // Check if reaction already exists
  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", profile.id)
    .eq("emoji", emoji)
    .single();

  if (existing) {
    // Remove reaction (toggle off)
    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("id", existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    // Add reaction (toggle on)
    const { error } = await supabase.from("reactions").insert({
      comment_id: commentId,
      user_id: profile.id,
      emoji,
    });
    if (error) return { success: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}
