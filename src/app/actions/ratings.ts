"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function upsertRating(
  eventId: string,
  rating: number,
  review: string | null
) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { success: false, error: "Rating must be between 1 and 5" };
  }

  if (review && review.length > 500) {
    return { success: false, error: "Review must be 500 characters or less" };
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

  // Validate event is in the past
  const { data: event } = await supabase
    .from("events")
    .select("id, date")
    .eq("id", eventId)
    .single();
  if (!event) return { success: false, error: "Event not found" };
  if (new Date(event.date) >= new Date()) {
    return { success: false, error: "Can only rate past events" };
  }

  // Validate user RSVPed "yes"
  const { data: rsvp } = await supabase
    .from("rsvps")
    .select("status")
    .eq("event_id", eventId)
    .eq("user_id", profile.id)
    .single();
  if (!rsvp || rsvp.status !== "yes") {
    return { success: false, error: "You must have RSVPed yes to rate this event" };
  }

  // Upsert: check if existing rating
  const { data: existing } = await supabase
    .from("event_ratings")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", profile.id)
    .single();

  const trimmedReview = review?.trim() || null;

  if (existing) {
    const { error } = await supabase
      .from("event_ratings")
      .update({ rating, review: trimmedReview })
      .eq("id", existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from("event_ratings").insert({
      event_id: eventId,
      user_id: profile.id,
      rating,
      review: trimmedReview,
    });
    if (error) return { success: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function deleteRating(eventId: string) {
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
    .from("event_ratings")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", profile.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}
