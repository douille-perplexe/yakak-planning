import { createServiceClient } from "@/lib/supabase/server";
import { createNotifications, getAllApprovedMemberIds } from "@/lib/notifications";
import { getTierEmoji } from "@/lib/achievement-utils";
import { AchievementTier, PoopMapPoop } from "@/lib/types";
import { fetchMyPoops } from "@/lib/poopmap";

// Cache poop data per user to avoid redundant API calls when checking multiple poop achievement groups
const poopCache = new Map<string, PoopMapPoop[]>();

async function getCachedPoops(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  userId: string
): Promise<PoopMapPoop[]> {
  const cached = poopCache.get(userId);
  if (cached) return cached;

  const { data: token } = await supabase
    .from("poopmap_tokens")
    .select("device_token")
    .eq("user_id", userId)
    .single();

  if (!token) {
    poopCache.set(userId, []);
    return [];
  }

  try {
    const poops = await fetchMyPoops(token.device_token);
    poopCache.set(userId, poops);
    return poops;
  } catch {
    poopCache.set(userId, []);
    return [];
  }
}

function calculateMaxConsecutiveDays(poops: PoopMapPoop[]): number {
  if (poops.length === 0) return 0;

  const uniqueDays = new Set(
    poops.map((p) => {
      const d = new Date(p.created_at);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  const sorted = Array.from(uniqueDays)
    .map((s) => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m, d).getTime();
    })
    .sort((a, b) => a - b);

  let maxStreak = 1;
  let currentStreak = 1;
  const ONE_DAY = 86400000;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === ONE_DAY) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

type CheckerFn = (
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  userId: string
) => Promise<number>;

const CHECKERS: Record<string, CheckerFn> = {
  event_veteran: async (supabase, userId) => {
    const { count } = await supabase
      .from("rsvps")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "yes");
    return count ?? 0;
  },

  streak_master: async (supabase, userId) => {
    // Get all events the user RSVPed yes to, ordered by event date
    const { data: rsvps } = await supabase
      .from("rsvps")
      .select("event_id, events!inner(date)")
      .eq("user_id", userId)
      .eq("status", "yes")
      .order("events(date)", { ascending: false });

    if (!rsvps || rsvps.length === 0) return 0;

    // Get all events ordered by date to check consecutive attendance
    const { data: allEvents } = await supabase
      .from("events")
      .select("id, date")
      .is("deleted_at", null)
      .lte("date", new Date().toISOString())
      .order("date", { ascending: false });

    if (!allEvents || allEvents.length === 0) return 0;

    const attendedIds = new Set(rsvps.map((r) => r.event_id));
    let streak = 0;

    for (const event of allEvents) {
      if (attendedIds.has(event.id)) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  },

  weekend_warrior: async (supabase, userId) => {
    const { data: rsvps } = await supabase
      .from("rsvps")
      .select("event_id, events!inner(date)")
      .eq("user_id", userId)
      .eq("status", "yes");

    if (!rsvps) return 0;

    let count = 0;
    for (const rsvp of rsvps) {
      const eventDate = new Date((rsvp as unknown as { events: { date: string } }).events.date);
      const day = eventDate.getDay();
      if (day === 0 || day === 6) count++;
    }
    return count;
  },

  commentator: async (supabase, userId) => {
    const { count } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    return count ?? 0;
  },

  poll_enthusiast: async (supabase, userId) => {
    const { data: votes } = await supabase
      .from("poll_votes")
      .select("poll_id")
      .eq("user_id", userId);

    if (!votes) return 0;
    const uniquePolls = new Set(votes.map((v) => v.poll_id));
    return uniquePolls.size;
  },

  plus_one_pro: async (supabase, userId) => {
    const { count } = await supabase
      .from("rsvps")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "yes")
      .gt("guest_count", 0);
    return count ?? 0;
  },

  organizer: async (supabase, userId) => {
    const { count } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("created_by", userId)
      .is("deleted_at", null);
    return count ?? 0;
  },

  social_butterfly: async (supabase, userId) => {
    const { count } = await supabase
      .from("rsvps")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "yes");
    return count ?? 0;
  },

  poop_veteran: async (supabase, userId) => {
    const poops = await getCachedPoops(supabase, userId);
    return poops.length;
  },

  poop_rater: async (supabase, userId) => {
    const poops = await getCachedPoops(supabase, userId);
    return poops.filter((p) => p.rating != null && p.rating > 0).length;
  },

  poop_explorer: async (supabase, userId) => {
    const poops = await getCachedPoops(supabase, userId);
    return new Set(poops.filter((p) => p.place).map((p) => p.place)).size;
  },

  poop_streak: async (supabase, userId) => {
    const poops = await getCachedPoops(supabase, userId);
    return calculateMaxConsecutiveDays(poops);
  },
};

export async function checkAndGrantAchievements(
  userId: string,
  groups: string[]
) {
  const supabase = await createServiceClient();

  // Fetch definitions for requested groups
  const { data: definitions } = await supabase
    .from("achievement_definitions")
    .select("*")
    .in("achievement_group", groups)
    .eq("is_automatic", true)
    .order("tier_position", { ascending: true });

  if (!definitions || definitions.length === 0) return;

  // Fetch user's existing unlocks
  const defIds = definitions.map((d) => d.id);
  const { data: existing } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId)
    .in("achievement_id", defIds);

  const unlockedIds = new Set((existing ?? []).map((e) => e.achievement_id));

  // Get user display name for notification
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .single();

  const displayName = userProfile?.display_name ?? "Someone";

  // Check each group
  const groupedDefs = new Map<string, typeof definitions>();
  for (const def of definitions) {
    const group = groupedDefs.get(def.achievement_group) ?? [];
    group.push(def);
    groupedDefs.set(def.achievement_group, group);
  }

  for (const [group, defs] of groupedDefs) {
    const checker = CHECKERS[group];
    if (!checker) continue;

    const currentCount = await checker(supabase, userId);

    for (const def of defs) {
      if (unlockedIds.has(def.id)) continue;
      if (currentCount < def.threshold) continue;

      // Grant achievement
      const { error } = await supabase
        .from("user_achievements")
        .insert({
          user_id: userId,
          achievement_id: def.id,
          granted_by: null,
        });

      if (error) continue; // Already exists or other error

      // Notify all members
      const emoji = getTierEmoji(def.tier as AchievementTier);
      getAllApprovedMemberIds()
        .then((memberIds) =>
          createNotifications({
            type: "achievement_unlocked",
            referenceId: def.id,
            message: `${emoji} ${displayName} unlocked ${def.name} (${def.tier})!`,
            recipientIds: memberIds,
          })
        )
        .catch((err) => console.error("[achievement-notify]", err));
    }
  }

  // Clear poop cache after all checks complete
  poopCache.delete(userId);
}
