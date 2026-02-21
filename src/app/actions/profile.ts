"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function updateProfileAction(formData: FormData) {
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

  const displayName = (formData.get("display_name") as string)?.trim();
  const bio = (formData.get("bio") as string)?.trim() ?? "";
  const avatarFile = formData.get("avatar") as File | null;

  if (!displayName) return { success: false, error: "Display name is required" };
  if (displayName.length > 50) return { success: false, error: "Display name must be 50 characters or fewer" };
  if (bio.length > 200) return { success: false, error: "Bio must be 200 characters or fewer" };

  let avatarUrl: string | undefined;

  if (avatarFile && avatarFile.size > 0) {
    if (!ALLOWED_TYPES.includes(avatarFile.type)) {
      return { success: false, error: "Avatar must be a JPEG, PNG, or WebP image" };
    }
    if (avatarFile.size > MAX_SIZE) {
      return { success: false, error: "Avatar must be under 5 MB" };
    }

    const ext = avatarFile.type === "image/jpeg" ? "jpg"
      : avatarFile.type === "image/png" ? "png"
      : "webp";
    const path = `${profile.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });

    if (uploadError) {
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);
    avatarUrl = publicUrlData.publicUrl;
  }

  const updates: Record<string, string> = {
    display_name: displayName,
    bio,
  };
  if (avatarUrl) {
    updates.avatar_url = avatarUrl;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", user.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath(`/profile/${profile.id}`);
  revalidatePath("/");
  revalidatePath("/settings");

  return { success: true };
}
