"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createNotifications,
  getAllApprovedMemberIds,
  getPollVoterIds,
} from "@/lib/notifications";

export async function createPoll(
  eventId: string,
  question: string,
  options: string[]
) {
  if (!question?.trim() || question.length > 200) {
    return { success: false, error: "Question is required (max 200 characters)" };
  }
  const validOptions = options.filter((o) => o.trim());
  if (validOptions.length < 2 || validOptions.length > 6) {
    return { success: false, error: "Provide between 2 and 6 options" };
  }
  if (validOptions.some((o) => o.length > 100)) {
    return { success: false, error: "Each option must be under 100 characters" };
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

  // Create poll
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({
      event_id: eventId,
      user_id: profile.id,
      question: question.trim(),
    })
    .select()
    .single();

  if (pollError) return { success: false, error: pollError.message };

  // Create options
  const optionRows = validOptions.map((label, i) => ({
    poll_id: poll.id,
    label: label.trim(),
    position: i,
  }));

  const { error: optError } = await supabase
    .from("poll_options")
    .insert(optionRows);

  if (optError) return { success: false, error: optError.message };

  // Notify all members about the new poll
  getAllApprovedMemberIds().then((memberIds) =>
    createNotifications({
      type: "poll_created",
      referenceId: eventId,
      message: `New poll: ${poll.question}`,
      recipientIds: memberIds,
      excludeUserId: profile.id,
    })
  ).catch(() => {});

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function votePoll(
  pollId: string,
  optionId: string,
  eventId: string
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

  // Check if user already voted
  const { data: existing } = await supabase
    .from("poll_votes")
    .select("id")
    .eq("poll_id", pollId)
    .eq("user_id", profile.id)
    .single();

  if (existing) {
    // Update existing vote
    const { error } = await supabase
      .from("poll_votes")
      .update({ option_id: optionId })
      .eq("id", existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    // Insert new vote
    const { error } = await supabase.from("poll_votes").insert({
      poll_id: pollId,
      option_id: optionId,
      user_id: profile.id,
    });
    if (error) return { success: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function closePoll(pollId: string, eventId: string) {
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
    .from("polls")
    .update({ is_closed: true })
    .eq("id", pollId);

  if (error) return { success: false, error: error.message };

  // Notify voters that the poll is closed
  getPollVoterIds(pollId).then((voterIds) =>
    createNotifications({
      type: "poll_closed",
      referenceId: eventId,
      message: `A poll has been closed`,
      recipientIds: voterIds,
      excludeUserId: profile.id,
    })
  ).catch(() => {});

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}
