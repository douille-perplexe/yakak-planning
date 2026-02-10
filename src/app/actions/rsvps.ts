"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { RsvpStatus } from "@/lib/types";
import { createNotifications, getEventCreatorId } from "@/lib/notifications";

const VALID_STATUSES: RsvpStatus[] = ["yes", "no", "maybe"];

export async function upsertRsvp(eventId: string, status: RsvpStatus) {
  if (!VALID_STATUSES.includes(status)) {
    return { success: false, error: "Invalid RSVP status" };
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

  // Check if RSVP already exists
  const { data: existing } = await supabase
    .from("rsvps")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", profile.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("rsvps")
      .update({ status })
      .eq("id", existing.id);

    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from("rsvps").insert({
      event_id: eventId,
      user_id: profile.id,
      status,
    });

    if (error) return { success: false, error: error.message };
  }

  // Notify event creator about the RSVP
  getEventCreatorId(eventId).then((creatorId) => {
    if (!creatorId) return;
    return createNotifications({
      type: "new_rsvp",
      referenceId: eventId,
      message: `New RSVP: ${status}`,
      recipientIds: [creatorId],
      excludeUserId: profile.id,
    });
  }).catch(() => {});

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/");
  return { success: true };
}
