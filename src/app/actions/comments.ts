"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createNotifications,
  getEventCreatorId,
  getEventRespondersIds,
} from "@/lib/notifications";
import { checkAndGrantAchievements } from "@/lib/achievements";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function createComment(
  eventId: string,
  content: string,
  imageFormData?: FormData
) {
  const trimmed = content?.trim() ?? "";
  if (!trimmed && !imageFormData) {
    return { success: false, error: "Comment must have text or an image" };
  }
  if (trimmed.length > 2000) {
    return { success: false, error: "Comment must be under 2000 characters" };
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

  let imageUrl: string | null = null;

  // Handle image upload if provided
  if (imageFormData) {
    const file = imageFormData.get("image") as File | null;
    if (file && file.size > 0) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return { success: false, error: "Only JPEG, PNG, and WebP images are allowed" };
      }
      if (file.size > MAX_SIZE) {
        return { success: false, error: "Image must be under 5 MB" };
      }

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${profile.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("comment-images")
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        return { success: false, error: `Upload failed: ${uploadError.message}` };
      }

      const { data: urlData } = supabase.storage
        .from("comment-images")
        .getPublicUrl(path);

      imageUrl = urlData.publicUrl;
    }
  }

  const { data: newComment, error } = await supabase
    .from("comments")
    .insert({
      event_id: eventId,
      user_id: profile.id,
      content: trimmed,
      image_url: imageUrl,
    })
    .select("*, user:profiles!comments_user_id_fkey(id, display_name, avatar_url, featured_badge:achievement_definitions(id, name, icon, tier))")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Check achievements (fire-and-forget)
  checkAndGrantAchievements(profile.id, ["commentator"]).catch((err) =>
    console.error("[achievements]", err)
  );

  // Notify event creator + yes/maybe responders about new comment
  Promise.all([
    getEventCreatorId(eventId),
    getEventRespondersIds(eventId),
  ]).then(([creatorId, responderIds]) => {
    const recipientIds = [...new Set([
      ...(creatorId ? [creatorId] : []),
      ...responderIds,
    ])];
    return createNotifications({
      type: "new_comment",
      referenceId: eventId,
      message: `New comment on event`,
      recipientIds,
      excludeUserId: profile.id,
    });
  }).catch((err) => console.error("[notify]", err));

  revalidatePath(`/events/${eventId}`);
  return {
    success: true,
    comment: {
      ...newComment,
      reactions: [] as { emoji: string; count: number; reacted_by_me: boolean }[],
    },
  };
}

export async function deleteComment(commentId: string, eventId: string) {
  const supabase = await createClient();

  // Get the comment to check for image_url before deleting
  const { data: comment } = await supabase
    .from("comments")
    .select("image_url")
    .eq("id", commentId)
    .single();

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Clean up image from storage if present
  if (comment?.image_url) {
    const path = comment.image_url.split("/comment-images/")[1];
    if (path) {
      await supabase.storage.from("comment-images").remove([path]);
    }
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}
