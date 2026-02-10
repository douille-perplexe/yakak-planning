import { createServiceClient } from "@/lib/supabase/server";
import { NotificationType } from "@/lib/types";
import { sendNotificationEmail } from "@/lib/email";

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

  // Check preferences for each recipient
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id, in_app_enabled, email_enabled")
    .eq("type", type)
    .in("user_id", filteredIds);

  // Build preference maps
  const inAppDisabledSet = new Set(
    (prefs ?? [])
      .filter((p: { user_id: string; in_app_enabled: boolean }) => !p.in_app_enabled)
      .map((p: { user_id: string }) => p.user_id)
  );

  const emailEnabledSet = new Set(
    (prefs ?? [])
      .filter((p: { user_id: string; email_enabled: boolean }) => p.email_enabled)
      .map((p: { user_id: string }) => p.user_id)
  );

  // In-app notifications
  const inAppEligibleIds = filteredIds.filter((id) => !inAppDisabledSet.has(id));
  if (inAppEligibleIds.length > 0) {
    const rows = inAppEligibleIds.map((userId) => ({
      user_id: userId,
      type,
      reference_id: referenceId,
      message,
      read: false,
    }));
    await supabase.from("notifications").insert(rows);
  }

  // Email notifications
  const emailEligibleIds = filteredIds.filter((id) => emailEnabledSet.has(id));
  if (emailEligibleIds.length > 0) {
    // Fetch email addresses for eligible recipients
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", emailEligibleIds);

    for (const profile of profiles ?? []) {
      if (profile.email) {
        sendNotificationEmail({
          to: profile.email,
          subject: message,
          message,
          eventId: referenceId,
        }).catch(() => {});
      }
    }
  }
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
