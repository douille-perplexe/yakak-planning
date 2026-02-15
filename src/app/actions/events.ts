"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createNotifications,
  getAllApprovedMemberIds,
  getEventRespondersIds,
} from "@/lib/notifications";
import { checkAndGrantAchievements } from "@/lib/achievements";

interface CreateEventInput {
  title: string;
  date: string;
  location: string;
  description?: string;
  duration_minutes?: number;
  reminder_hours?: number;
  estimated_cost?: number | null;
  category_ids?: string[];
}

export async function createEvent(input: CreateEventInput) {
  const supabase = await createClient();

  // Validate
  if (!input.title?.trim() || input.title.length > 100) {
    return { success: false, error: "Title is required (max 100 characters)" };
  }
  if (!input.date) {
    return { success: false, error: "Date is required" };
  }
  if (!input.location?.trim() || input.location.length > 200) {
    return {
      success: false,
      error: "Location is required (max 200 characters)",
    };
  }
  if (input.description && input.description.length > 2000) {
    return {
      success: false,
      error: "Description must be under 2000 characters",
    };
  }
  if (
    input.estimated_cost !== undefined &&
    input.estimated_cost !== null &&
    input.estimated_cost < 0
  ) {
    return { success: false, error: "Cost must be 0 or greater" };
  }
  if (
    input.duration_minutes !== undefined &&
    (input.duration_minutes < 15 || input.duration_minutes > 1440)
  ) {
    return { success: false, error: "Duration must be between 15 and 1440 minutes" };
  }

  // Get current user's profile id
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

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      title: input.title.trim(),
      date: input.date,
      location: input.location.trim(),
      description: input.description?.trim() || null,
      estimated_cost:
        input.estimated_cost !== undefined && input.estimated_cost !== null
          ? input.estimated_cost
          : null,
      duration_minutes: input.duration_minutes ?? 120,
      reminder_hours: input.reminder_hours ?? 24,
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Insert event categories
  if (input.category_ids?.length) {
    await supabase.from("event_categories").insert(
      input.category_ids.map((cid) => ({
        event_id: event.id,
        category_id: cid,
      }))
    );
  }

  // Check achievements (fire-and-forget)
  checkAndGrantAchievements(profile.id, ["organizer"]).catch((err) =>
    console.error("[achievements]", err)
  );

  // Notify all members about the new event
  getAllApprovedMemberIds().then((memberIds) =>
    createNotifications({
      type: "event_created",
      referenceId: event.id,
      message: `New event: ${event.title}`,
      recipientIds: memberIds,
      excludeUserId: profile.id,
    })
  ).catch((err) => console.error("[notify]", err));

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/stats");
  redirect(`/events/${event.id}`);
}

export async function updateEvent(
  eventId: string,
  input: Partial<CreateEventInput>
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

  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) {
    if (!input.title?.trim() || input.title.length > 100) {
      return {
        success: false,
        error: "Title is required (max 100 characters)",
      };
    }
    updates.title = input.title.trim();
  }
  if (input.date !== undefined) updates.date = input.date;
  if (input.location !== undefined) {
    if (!input.location?.trim() || input.location.length > 200) {
      return {
        success: false,
        error: "Location is required (max 200 characters)",
      };
    }
    updates.location = input.location.trim();
  }
  if (input.description !== undefined)
    updates.description = input.description?.trim() || null;
  if (input.duration_minutes !== undefined) {
    if (input.duration_minutes < 15 || input.duration_minutes > 1440) {
      return { success: false, error: "Duration must be between 15 and 1440 minutes" };
    }
    updates.duration_minutes = input.duration_minutes;
  }
  if (input.reminder_hours !== undefined)
    updates.reminder_hours = input.reminder_hours;
  if (input.estimated_cost !== undefined)
    updates.estimated_cost = input.estimated_cost;

  const { error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", eventId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Update event categories (delete + reinsert)
  if (input.category_ids !== undefined) {
    await supabase.from("event_categories").delete().eq("event_id", eventId);
    if (input.category_ids.length > 0) {
      await supabase.from("event_categories").insert(
        input.category_ids.map((cid) => ({
          event_id: eventId,
          category_id: cid,
        }))
      );
    }
  }

  // Notify all members about the update
  const eventTitle = (updates.title as string) || "An event";
  getAllApprovedMemberIds().then((memberIds) =>
    createNotifications({
      type: "event_updated",
      referenceId: eventId,
      message: `Event updated: ${eventTitle}`,
      recipientIds: memberIds,
      excludeUserId: profile.id,
    })
  ).catch((err) => console.error("[notify]", err));

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/stats");
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function deleteEvent(eventId: string) {
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

  // Fetch event title and responders before soft-delete (RLS hides deleted events)
  const serviceClient = await createServiceClient();
  const { data: eventData } = await serviceClient
    .from("events")
    .select("title")
    .eq("id", eventId)
    .single();

  // Verify the user is the creator or an admin
  const { data: eventCheck } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", eventId)
    .single();

  if (!eventCheck) return { success: false, error: "Event not found" };

  const { data: profileCheck } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", profile.id)
    .single();

  if (
    eventCheck.created_by !== profile.id &&
    profileCheck?.role !== "admin"
  ) {
    return { success: false, error: "Not authorized" };
  }

  const respondersPromise = getEventRespondersIds(eventId);

  // Use service client because RLS SELECT policy filters deleted_at IS NULL,
  // which can cause the regular client's update to silently affect 0 rows
  const { error } = await serviceClient
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Notify yes/maybe responders about cancellation
  const eventTitle = eventData?.title || "An event";
  respondersPromise.then((responderIds) =>
    createNotifications({
      type: "event_cancelled",
      referenceId: eventId,
      message: `Event cancelled: ${eventTitle}`,
      recipientIds: responderIds,
      excludeUserId: profile.id,
    })
  ).catch((err) => console.error("[notify]", err));

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/stats");
  redirect("/");
}

export async function togglePinEvent(eventId: string) {
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
    return { success: false, error: "Only admins can pin events" };
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, is_pinned")
    .eq("id", eventId)
    .single();

  if (!event) return { success: false, error: "Event not found" };

  const newPinned = !event.is_pinned;

  // If pinning, unpin all other events first
  if (newPinned) {
    await supabase
      .from("events")
      .update({ is_pinned: false })
      .eq("is_pinned", true);
  }

  const { error } = await supabase
    .from("events")
    .update({ is_pinned: newPinned })
    .eq("id", eventId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath(`/events/${eventId}`);
  return { success: true, pinned: newPinned };
}
