"use server";

import { createClient } from "@/lib/supabase/server";
import { NotificationType } from "@/lib/types";

export async function updateNotifPrefs(
  type: NotificationType,
  field: "email_enabled" | "in_app_enabled",
  value: boolean
) {
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
    .from("notification_preferences")
    .upsert(
      {
        user_id: profile.id,
        type,
        [field]: value,
      },
      { onConflict: "user_id,type" }
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}
