"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createComment(eventId: string, content: string) {
  if (!content?.trim() || content.length > 2000) {
    return { success: false, error: "Comment must be between 1 and 2000 characters" };
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

  const { error } = await supabase.from("comments").insert({
    event_id: eventId,
    user_id: profile.id,
    content: content.trim(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function deleteComment(commentId: string, eventId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}
