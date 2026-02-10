import { createServiceClient } from "@/lib/supabase/server";
import { NotificationType } from "@/lib/types";

interface CreateNotificationsParams {
  type: NotificationType;
  referenceId: string;
  message: string;
  recipientIds: string[];
  excludeUserId?: string;
}

export async function createNotifications({
  type,
  referenceId,
  message,
  recipientIds,
  excludeUserId,
}: CreateNotificationsParams) {
  const supabase = await createServiceClient();

  // Filter out the actor
  const filteredIds = excludeUserId
    ? recipientIds.filter((id) => id !== excludeUserId)
    : recipientIds;

  if (filteredIds.length === 0) return;

  // Check in_app_enabled preferences for each recipient
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id, in_app_enabled")
    .eq("type", type)
    .in("user_id", filteredIds);

  // Build a set of users who have in-app disabled
  const disabledSet = new Set(
    (prefs ?? [])
      .filter((p: { user_id: string; in_app_enabled: boolean }) => !p.in_app_enabled)
      .map((p: { user_id: string }) => p.user_id)
  );

  const eligibleIds = filteredIds.filter((id) => !disabledSet.has(id));
  if (eligibleIds.length === 0) return;

  const rows = eligibleIds.map((userId) => ({
    user_id: userId,
    type,
    reference_id: referenceId,
    message,
    read: false,
  }));

  await supabase.from("notifications").insert(rows);
}

export async function getAllApprovedMemberIds(): Promise<string[]> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("status", "approved");

  return (data ?? []).map((p: { id: string }) => p.id);
}

export async function getEventRespondersIds(eventId: string): Promise<string[]> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("rsvps")
    .select("user_id")
    .eq("event_id", eventId)
    .in("status", ["yes", "maybe"]);

  return (data ?? []).map((r: { user_id: string }) => r.user_id);
}

export async function getEventCreatorId(eventId: string): Promise<string | null> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", eventId)
    .single();

  return data?.created_by ?? null;
}

export async function getPollVoterIds(pollId: string): Promise<string[]> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("poll_votes")
    .select("user_id")
    .eq("poll_id", pollId);

  return [...new Set((data ?? []).map((v: { user_id: string }) => v.user_id))];
}
