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

  // Build preference maps — users without a preference row default to enabled
  const prefsMap = new Map(
    (prefs ?? []).map((p: { user_id: string; in_app_enabled: boolean; email_enabled: boolean }) => [
      p.user_id,
      p,
    ])
  );

  // In-app notifications: send unless explicitly disabled
  const inAppEligibleIds = filteredIds.filter((id) => {
    const pref = prefsMap.get(id);
    return !pref || pref.in_app_enabled;
  });

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

  // Email notifications: send unless explicitly disabled
  const emailEligibleIds = filteredIds.filter((id) => {
    const pref = prefsMap.get(id);
    return !pref || pref.email_enabled;
  });

  if (emailEligibleIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .in("id", emailEligibleIds);

    for (const profile of profiles ?? []) {
      if (profile.email) {
        sendNotificationEmail({
          to: profile.email,
          subject: message,
          message,
          eventId: referenceId,
        }).catch((err) => {
          console.error(
            `[email] Failed to send to ${profile.email}:`,
            err instanceof Error ? err.message : err
          );
        });
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
