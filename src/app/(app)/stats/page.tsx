import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Users,
  Wallet,
  Trophy,
  TrendingDown,
  Target,
  ArrowUpRight,
  Sparkles,
  Heart,
  Sun,
  Moon,
  Crown,
  Star,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  MapPin,
  Flame,
  Zap,
} from "lucide-react";
import { ActivityCategory, PoopMapPoop } from "@/lib/types";
import {
  getCategoryIcon,
  getCategoryColorClass,
} from "@/lib/category-utils";
import { fetchMyPoops } from "@/lib/poopmap";

interface MemberProfile {
  id: string;
  display_name: string;
  avatar_url: string;
}

export default async function StatsPage() {
  const supabase = await createClient();

  // 1. All past non-deleted events
  const now = new Date().toISOString();
  const { data: pastEvents } = await supabase
    .from("events")
    .select("id, title, date, estimated_cost, created_by")
    .is("deleted_at", null)
    .lt("date", now)
    .order("date", { ascending: false });

  const events = pastEvents ?? [];

  if (events.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Stats</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No stats yet</h2>
            <p className="text-muted-foreground">
              Create some events and the fun begins!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const eventIds = events.map((e) => e.id);

  // 2. All 'yes' RSVPs for those events
  const { data: yesRsvps } = await supabase
    .from("rsvps")
    .select("event_id, user_id")
    .in("event_id", eventIds)
    .eq("status", "yes");

  const rsvps = yesRsvps ?? [];

  // 3. All event_categories for those events
  const { data: eventCats } = await supabase
    .from("event_categories")
    .select("event_id, category_id")
    .in("event_id", eventIds);

  const eventCategories = eventCats ?? [];

  // 3b. All event ratings for past events
  const { data: allRatings } = await supabase
    .from("event_ratings")
    .select("event_id, user_id, rating, review")
    .in("event_id", eventIds);

  const ratings = allRatings ?? [];

  // 4. All activity_categories
  const { data: allCats } = await supabase
    .from("activity_categories")
    .select("*")
    .order("position", { ascending: true });

  const categories = (allCats ?? []) as ActivityCategory[];
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // 5. All approved member profiles
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("status", "approved");

  const profiles = (allProfiles ?? []) as MemberProfile[];
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  // Build data structures
  const eventMap = new Map(events.map((e) => [e.id, e]));

  // Member -> events attended
  const memberEvents = new Map<string, string[]>();
  for (const r of rsvps) {
    const list = memberEvents.get(r.user_id) ?? [];
    list.push(r.event_id);
    memberEvents.set(r.user_id, list);
  }

  // Event -> attendees
  const eventAttendees = new Map<string, string[]>();
  for (const r of rsvps) {
    const list = eventAttendees.get(r.event_id) ?? [];
    list.push(r.user_id);
    eventAttendees.set(r.event_id, list);
  }

  // Event -> category IDs
  const eventCategoryMap = new Map<string, string[]>();
  for (const ec of eventCategories) {
    const list = eventCategoryMap.get(ec.event_id) ?? [];
    list.push(ec.category_id);
    eventCategoryMap.set(ec.event_id, list);
  }

  // ==================== OVERVIEW CARDS ====================
  const totalPastEvents = events.length;
  const uniqueParticipants = new Set(rsvps.map((r) => r.user_id)).size;

  // Total money spent = sum of (estimated_cost * attendees) for events with cost
  let totalMoneySpent = 0;
  for (const e of events) {
    if (e.estimated_cost != null) {
      const attendeeCount = eventAttendees.get(e.id)?.length ?? 0;
      totalMoneySpent += Number(e.estimated_cost) * attendeeCount;
    }
  }

  // Most popular category
  const categoryCounts = new Map<string, number>();
  for (const ec of eventCategories) {
    categoryCounts.set(
      ec.category_id,
      (categoryCounts.get(ec.category_id) ?? 0) + 1
    );
  }
  let mostPopularCategory: ActivityCategory | null = null;
  let maxCatCount = 0;
  for (const [catId, count] of categoryCounts) {
    if (count > maxCatCount) {
      maxCatCount = count;
      mostPopularCategory = categoryMap.get(catId) ?? null;
    }
  }

  // ==================== RATING STATS ====================
  const globalAvgRating =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

  // Event -> ratings list
  const eventRatingsMap = new Map<string, number[]>();
  for (const r of ratings) {
    const list = eventRatingsMap.get(r.event_id) ?? [];
    list.push(r.rating);
    eventRatingsMap.set(r.event_id, list);
  }

  // Events with avg rating (min 3 ratings)
  const ratedEvents: { id: string; title: string; avg: number; count: number }[] = [];
  for (const [eid, ratingList] of eventRatingsMap) {
    if (ratingList.length >= 3) {
      const ev = eventMap.get(eid);
      if (ev) {
        ratedEvents.push({
          id: eid,
          title: ev.title,
          avg: ratingList.reduce((a, b) => a + b, 0) / ratingList.length,
          count: ratingList.length,
        });
      }
    }
  }
  ratedEvents.sort((a, b) => b.avg - a.avg);

  const bestRatedEvents = ratedEvents.slice(0, 3);
  const couldImproveEvents =
    ratedEvents.length >= 3
      ? [...ratedEvents].sort((a, b) => a.avg - b.avg).slice(0, 3)
      : [];

  // Best category ratings
  const categoryRatings = new Map<string, number[]>();
  for (const r of ratings) {
    const catIds = eventCategoryMap.get(r.event_id) ?? [];
    for (const catId of catIds) {
      const list = categoryRatings.get(catId) ?? [];
      list.push(r.rating);
      categoryRatings.set(catId, list);
    }
  }
  const bestCategoryRatings = Array.from(categoryRatings.entries())
    .map(([catId, rList]) => ({
      category: categoryMap.get(catId),
      avg: rList.reduce((a, b) => a + b, 0) / rList.length,
      count: rList.length,
    }))
    .filter((c) => c.category)
    .sort((a, b) => b.avg - a.avg);

  // Member avg ratings given (top 5)
  const memberRatingsGiven = new Map<string, number[]>();
  for (const r of ratings) {
    const list = memberRatingsGiven.get(r.user_id) ?? [];
    list.push(r.rating);
    memberRatingsGiven.set(r.user_id, list);
  }
  const memberAvgRatings = Array.from(memberRatingsGiven.entries())
    .map(([uid, rList]) => ({
      profile: profileMap.get(uid),
      avg: rList.reduce((a, b) => a + b, 0) / rList.length,
      count: rList.length,
    }))
    .filter((m) => m.profile)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  // Best reviewer: member with most reviews (ratings with review text)
  const memberReviewCounts = new Map<string, number>();
  for (const r of ratings) {
    if (r.review) {
      memberReviewCounts.set(
        r.user_id,
        (memberReviewCounts.get(r.user_id) ?? 0) + 1
      );
    }
  }
  let bestReviewerId = "";
  let bestReviewerCount = 0;
  for (const [uid, count] of memberReviewCounts) {
    if (count > bestReviewerCount) {
      bestReviewerCount = count;
      bestReviewerId = uid;
    }
  }
  const bestReviewer = profileMap.get(bestReviewerId);

  const hasRatingStats = ratedEvents.length > 0;

  // ==================== ACTIVITY RANKINGS ====================
  const memberRankings = profiles
    .map((p) => ({
      profile: p,
      count: memberEvents.get(p.id)?.length ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  const activeMembers = memberRankings.filter((m) => m.count > 0);
  const leastActive =
    memberRankings.length > 1
      ? memberRankings[memberRankings.length - 1]
      : null;

  // ==================== CATEGORY CHAMPIONS ====================
  // For each category, find the member who attended the most events with that category
  const categoryChampions: {
    category: ActivityCategory;
    champion: MemberProfile;
    count: number;
  }[] = [];

  for (const cat of categories) {
    // Events with this category
    const catEventIds = eventCategories
      .filter((ec) => ec.category_id === cat.id)
      .map((ec) => ec.event_id);

    if (catEventIds.length === 0) continue;

    const catEventSet = new Set(catEventIds);
    const memberCatCounts = new Map<string, number>();

    for (const r of rsvps) {
      if (catEventSet.has(r.event_id)) {
        memberCatCounts.set(
          r.user_id,
          (memberCatCounts.get(r.user_id) ?? 0) + 1
        );
      }
    }

    let champId = "";
    let champCount = 0;
    for (const [uid, cnt] of memberCatCounts) {
      if (cnt > champCount) {
        champCount = cnt;
        champId = uid;
      }
    }

    const champion = profileMap.get(champId);
    if (champion) {
      categoryChampions.push({ category: cat, champion, count: champCount });
    }
  }

  // ==================== MONEY STATS ====================
  // Per member: total cost from attended events
  const memberTotalCost = new Map<string, number>();
  const memberCostEventCount = new Map<string, number>();

  for (const r of rsvps) {
    const ev = eventMap.get(r.event_id);
    if (ev?.estimated_cost != null) {
      const cost = Number(ev.estimated_cost);
      memberTotalCost.set(
        r.user_id,
        (memberTotalCost.get(r.user_id) ?? 0) + cost
      );
      memberCostEventCount.set(
        r.user_id,
        (memberCostEventCount.get(r.user_id) ?? 0) + 1
      );
    }
  }

  // Biggest spender
  let biggestSpenderId = "";
  let biggestSpenderAmount = 0;
  for (const [uid, total] of memberTotalCost) {
    if (total > biggestSpenderAmount) {
      biggestSpenderAmount = total;
      biggestSpenderId = uid;
    }
  }
  const biggestSpender = profileMap.get(biggestSpenderId);

  // Most economical (at least 3 attended events with cost)
  let mostEconomicalId = "";
  let mostEconomicalAmount = Infinity;
  for (const [uid, total] of memberTotalCost) {
    if ((memberCostEventCount.get(uid) ?? 0) >= 3 && total < mostEconomicalAmount) {
      mostEconomicalAmount = total;
      mostEconomicalId = uid;
    }
  }
  const mostEconomical = profileMap.get(mostEconomicalId);

  // Best value hunter (lowest avg cost)
  let bestValueId = "";
  let bestValueAvg = Infinity;
  for (const [uid, total] of memberTotalCost) {
    const eventCount = memberCostEventCount.get(uid) ?? 0;
    if (eventCount > 0) {
      const avg = total / eventCount;
      if (avg < bestValueAvg) {
        bestValueAvg = avg;
        bestValueId = uid;
      }
    }
  }
  const bestValueHunter = profileMap.get(bestValueId);

  // Highest single event
  let highestCostEvent: { title: string; date: string; cost: number } | null =
    null;
  for (const e of events) {
    if (
      e.estimated_cost != null &&
      (highestCostEvent === null ||
        Number(e.estimated_cost) > highestCostEvent.cost)
    ) {
      highestCostEvent = {
        title: e.title,
        date: e.date,
        cost: Number(e.estimated_cost),
      };
    }
  }

  // ==================== FUN FACTS ====================

  // Social Butterfly: co-attended with most unique members
  let socialButterflyId = "";
  let maxCoAttendees = 0;
  for (const [uid, evIds] of memberEvents) {
    const coAttendees = new Set<string>();
    for (const eid of evIds) {
      const attendees = eventAttendees.get(eid) ?? [];
      for (const a of attendees) {
        if (a !== uid) coAttendees.add(a);
      }
    }
    if (coAttendees.size > maxCoAttendees) {
      maxCoAttendees = coAttendees.size;
      socialButterflyId = uid;
    }
  }
  const socialButterfly = profileMap.get(socialButterflyId);

  // Weekend Warrior: highest ratio of weekend events
  let weekendWarriorId = "";
  let weekendWarriorRatio = 0;
  for (const [uid, evIds] of memberEvents) {
    if (evIds.length < 2) continue;
    let weekendCount = 0;
    for (const eid of evIds) {
      const ev = eventMap.get(eid);
      if (ev) {
        const day = new Date(ev.date).getDay();
        if (day === 0 || day === 6) weekendCount++;
      }
    }
    const ratio = weekendCount / evIds.length;
    if (ratio > weekendWarriorRatio) {
      weekendWarriorRatio = ratio;
      weekendWarriorId = uid;
    }
  }
  const weekendWarrior = profileMap.get(weekendWarriorId);

  // Event Organizer MVP: created the most events
  const creatorCounts = new Map<string, number>();
  for (const e of events) {
    creatorCounts.set(
      e.created_by,
      (creatorCounts.get(e.created_by) ?? 0) + 1
    );
  }
  let organizerMvpId = "";
  let organizerMvpCount = 0;
  for (const [uid, count] of creatorCounts) {
    if (count > organizerMvpCount) {
      organizerMvpCount = count;
      organizerMvpId = uid;
    }
  }
  const organizerMvp = profileMap.get(organizerMvpId);

  // Loyalty Award: highest attendance rate (yes RSVPs / total events)
  let loyaltyId = "";
  let loyaltyRate = 0;
  for (const [uid, evIds] of memberEvents) {
    const rate = evIds.length / totalPastEvents;
    if (rate > loyaltyRate) {
      loyaltyRate = rate;
      loyaltyId = uid;
    }
  }
  const loyaltyAward = profileMap.get(loyaltyId);

  // Early Bird vs Night Owl
  const memberMorningCount = new Map<string, number>();
  const memberNightCount = new Map<string, number>();
  for (const r of rsvps) {
    const ev = eventMap.get(r.event_id);
    if (ev) {
      const hour = new Date(ev.date).getHours();
      if (hour < 12) {
        memberMorningCount.set(
          r.user_id,
          (memberMorningCount.get(r.user_id) ?? 0) + 1
        );
      }
      if (hour >= 20) {
        memberNightCount.set(
          r.user_id,
          (memberNightCount.get(r.user_id) ?? 0) + 1
        );
      }
    }
  }

  let earlyBirdId = "";
  let earlyBirdCount = 0;
  for (const [uid, count] of memberMorningCount) {
    if (count > earlyBirdCount) {
      earlyBirdCount = count;
      earlyBirdId = uid;
    }
  }
  const earlyBird = profileMap.get(earlyBirdId);

  let nightOwlId = "";
  let nightOwlCount = 0;
  for (const [uid, count] of memberNightCount) {
    if (count > nightOwlCount) {
      nightOwlCount = count;
      nightOwlId = uid;
    }
  }
  const nightOwl = profileMap.get(nightOwlId);

  const hasMoneyStats =
    biggestSpender || mostEconomical || bestValueHunter || highestCostEvent;

  // ==================== POOP MAP STATS ====================
  const serviceSupabase = await createServiceClient();
  const { data: poopTokens } = await serviceSupabase
    .from("poopmap_tokens")
    .select("user_id, device_token, poopmap_username, poopmap_user_id");

  const linkedUsers = poopTokens ?? [];

  // Fetch all poops in parallel
  const poopResults = await Promise.allSettled(
    linkedUsers.map(async (t) => ({
      userId: t.user_id,
      poops: await fetchMyPoops(t.device_token),
    }))
  );

  const userPoops = new Map<string, PoopMapPoop[]>();
  for (const result of poopResults) {
    if (result.status === "fulfilled") {
      userPoops.set(result.value.userId, result.value.poops);
    }
  }

  const allPoops = Array.from(userPoops.values()).flat();
  const poopersWithPoops = Array.from(userPoops.entries()).filter(
    ([, p]) => p.length > 0
  );

  // Poop overview
  const totalPoops = allPoops.length;
  const pooperCount = poopersWithPoops.length;
  const ratedPoops = allPoops.filter((p) => p.rating != null && p.rating > 0);
  const avgPoopRating =
    ratedPoops.length > 0
      ? ratedPoops.reduce((sum, p) => sum + p.rating!, 0) / ratedPoops.length
      : 0;

  // Most prolific pooper
  const poopCountRanking = poopersWithPoops
    .map(([uid, poops]) => ({
      profile: profileMap.get(uid),
      count: poops.length,
    }))
    .filter((m) => m.profile)
    .sort((a, b) => b.count - a.count);

  // Top poop places
  const placeCounts = new Map<string, number>();
  for (const p of allPoops) {
    if (p.place) {
      placeCounts.set(p.place, (placeCounts.get(p.place) ?? 0) + 1);
    }
  }
  const topPoopPlaces = Array.from(placeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Highest rated pooper (min 3 rated poops)
  let highestRatedPooper: { profile: MemberProfile; avg: number } | null = null;
  for (const [uid, poops] of userPoops) {
    const rated = poops.filter((p) => p.rating != null && p.rating > 0);
    if (rated.length >= 3) {
      const avg = rated.reduce((s, p) => s + p.rating!, 0) / rated.length;
      if (!highestRatedPooper || avg > highestRatedPooper.avg) {
        const profile = profileMap.get(uid);
        if (profile) highestRatedPooper = { profile, avg };
      }
    }
  }

  // Best poop streak
  let bestPoopStreak: { profile: MemberProfile; streak: number } | null = null;
  for (const [uid, poops] of userPoops) {
    if (poops.length === 0) continue;
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

    const profile = profileMap.get(uid);
    if (profile && (!bestPoopStreak || maxStreak > bestPoopStreak.streak)) {
      bestPoopStreak = { profile, streak: maxStreak };
    }
  }

  const hasPoopStats = linkedUsers.length > 0 && totalPoops > 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Stats</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CalendarDays className="h-4 w-4" />
              <span className="text-xs font-medium">Past Events</span>
            </div>
            <p className="text-2xl font-bold">{totalPastEvents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Participants</span>
            </div>
            <p className="text-2xl font-bold">{uniqueParticipants}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-medium">Total Spent</span>
            </div>
            <p className="text-2xl font-bold">
              {totalMoneySpent.toFixed(0)} EUR
            </p>
          </CardContent>
        </Card>
        {ratings.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Star className="h-4 w-4" />
                <span className="text-xs font-medium">Avg Rating</span>
              </div>
              <p className="text-2xl font-bold">
                {globalAvgRating.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">/5</span>
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Star className="h-4 w-4" />
              <span className="text-xs font-medium">Top Category</span>
            </div>
            {mostPopularCategory ? (
              <Badge
                className={
                  getCategoryColorClass(mostPopularCategory.color) + " border mt-1"
                }
              >
                {mostPopularCategory.name}
              </Badge>
            ) : (
              <p className="text-sm text-muted-foreground">None yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Rankings */}
      {activeMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Who shows up the most?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeMembers.map((m, i) => (
                <div
                  key={m.profile.id}
                  className="flex items-center gap-3"
                >
                  <span className="text-sm font-medium text-muted-foreground w-6 text-right">
                    {i === 0 ? (
                      <Trophy className="h-4 w-4 text-yellow-500 inline" />
                    ) : (
                      `#${i + 1}`
                    )}
                  </span>
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={m.profile.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {m.profile.display_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium flex-1">
                    {m.profile.display_name}
                  </span>
                  <Badge variant="secondary">{m.count} events</Badge>
                </div>
              ))}
              {leastActive && leastActive.count === 0 && (
                <p className="text-xs text-muted-foreground mt-4 italic">
                  Least active: {leastActive.profile.display_name} (0 events
                  — someone send them an invite!)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Champions */}
      {categoryChampions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Category Champions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categoryChampions.map(({ category, champion, count }) => {
                const Icon = getCategoryIcon(category.icon);
                return (
                  <div
                    key={category.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <Badge
                      className={
                        getCategoryColorClass(category.color) + " border"
                      }
                    >
                      <Icon className="h-3 w-3" />
                      {category.name}
                    </Badge>
                    <div className="flex items-center gap-2 ml-auto">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={champion.avatar_url} />
                        <AvatarFallback className="text-[10px]">
                          {champion.display_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{champion.display_name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({count})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Rated Events */}
      {hasRatingStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Top Rated Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Best Rated */}
              {bestRatedEvents.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Best Rated</span>
                  </div>
                  <div className="space-y-2">
                    {bestRatedEvents.map((e, i) => (
                      <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <span className="text-sm font-medium text-muted-foreground w-6 text-right">
                          #{i + 1}
                        </span>
                        <span className="text-sm font-medium flex-1">{e.title}</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{e.avg.toFixed(1)}</span>
                        </div>
                        <Badge variant="secondary">{e.count} ratings</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Could Improve */}
              {couldImproveEvents.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsDown className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Could Improve</span>
                  </div>
                  <div className="space-y-2">
                    {couldImproveEvents.map((e, i) => (
                      <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <span className="text-sm font-medium text-muted-foreground w-6 text-right">
                          #{i + 1}
                        </span>
                        <span className="text-sm font-medium flex-1">{e.title}</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{e.avg.toFixed(1)}</span>
                        </div>
                        <Badge variant="secondary">{e.count} ratings</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Best Category Ratings */}
              {bestCategoryRatings.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">Best Category Ratings</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {bestCategoryRatings.map(({ category, avg, count }) => {
                      const Icon = getCategoryIcon(category!.icon);
                      return (
                        <div
                          key={category!.id}
                          className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                        >
                          <Badge
                            className={getCategoryColorClass(category!.color) + " border"}
                          >
                            <Icon className="h-3 w-3" />
                            {category!.name}
                          </Badge>
                          <div className="flex items-center gap-1 ml-auto">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{avg.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">({count})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Member Avg Ratings */}
              {memberAvgRatings.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Member Avg Ratings</span>
                  </div>
                  <div className="space-y-2">
                    {memberAvgRatings.map(({ profile, avg, count }) => (
                      <div key={profile!.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={profile!.avatar_url} />
                          <AvatarFallback className="text-[10px]">
                            {profile!.display_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium flex-1">{profile!.display_name}</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{avg.toFixed(1)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">({count} ratings)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Money Stats */}
      {hasMoneyStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              The Wallet Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {biggestSpender && (
                <StatCard
                  icon={<ArrowUpRight className="h-4 w-4 text-red-500" />}
                  title="Biggest Spender"
                  profile={biggestSpender}
                  value={`${biggestSpenderAmount.toFixed(2)} EUR`}
                />
              )}
              {mostEconomical && (
                <StatCard
                  icon={<TrendingDown className="h-4 w-4 text-green-500" />}
                  title="Most Economical"
                  profile={mostEconomical}
                  value={`${mostEconomicalAmount.toFixed(2)} EUR`}
                />
              )}
              {bestValueHunter && (
                <StatCard
                  icon={<Target className="h-4 w-4 text-blue-500" />}
                  title="Best Value Hunter"
                  profile={bestValueHunter}
                  value={`~${bestValueAvg.toFixed(2)} EUR/event`}
                />
              )}
              {highestCostEvent && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Priciest Event
                    </span>
                  </div>
                  <p className="text-sm font-medium">
                    {highestCostEvent.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {highestCostEvent.cost.toFixed(2)} EUR &middot;{" "}
                    {new Date(highestCostEvent.date).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fun Facts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Did you know?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {socialButterfly && (
              <StatCard
                icon={<Heart className="h-4 w-4 text-pink-500" />}
                title="Social Butterfly"
                profile={socialButterfly}
                value={`${maxCoAttendees} unique co-attendees`}
              />
            )}
            {weekendWarrior && weekendWarriorRatio > 0 && (
              <StatCard
                icon={<Sun className="h-4 w-4 text-orange-500" />}
                title="Weekend Warrior"
                profile={weekendWarrior}
                value={`${Math.round(weekendWarriorRatio * 100)}% weekend events`}
              />
            )}
            {organizerMvp && (
              <StatCard
                icon={<Crown className="h-4 w-4 text-yellow-500" />}
                title="Organizer MVP"
                profile={organizerMvp}
                value={`${organizerMvpCount} events created`}
              />
            )}
            {loyaltyAward && (
              <StatCard
                icon={<Star className="h-4 w-4 text-indigo-500" />}
                title="Loyalty Award"
                profile={loyaltyAward}
                value={`${Math.round(loyaltyRate * 100)}% attendance`}
              />
            )}
            {earlyBird && earlyBirdCount > 0 && (
              <StatCard
                icon={<Sun className="h-4 w-4 text-amber-500" />}
                title="Early Bird"
                profile={earlyBird}
                value={`${earlyBirdCount} morning events`}
              />
            )}
            {nightOwl && nightOwlCount > 0 && (
              <StatCard
                icon={<Moon className="h-4 w-4 text-violet-500" />}
                title="Night Owl"
                profile={nightOwl}
                value={`${nightOwlCount} evening events`}
              />
            )}
            {bestReviewer && bestReviewerCount > 0 && (
              <StatCard
                icon={<MessageSquare className="h-4 w-4 text-teal-500" />}
                title="Best Reviewer"
                profile={bestReviewer}
                value={`${bestReviewerCount} reviews written`}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Poop Map Stats */}
      {hasPoopStats && (
        <>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            💩 Poop Map
          </h2>

          {/* Poop Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-medium">Total Poops</span>
                </div>
                <p className="text-2xl font-bold">{totalPoops}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium">Poopers</span>
                </div>
                <p className="text-2xl font-bold">{pooperCount}</p>
              </CardContent>
            </Card>
            {ratedPoops.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Star className="h-4 w-4" />
                    <span className="text-xs font-medium">Avg Rating</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {avgPoopRating.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">/5</span>
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Most Prolific Pooper */}
          {poopCountRanking.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Most Prolific Pooper
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {poopCountRanking.map((m, i) => (
                    <div
                      key={m.profile!.id}
                      className="flex items-center gap-3"
                    >
                      <span className="text-sm font-medium text-muted-foreground w-6 text-right">
                        {i === 0 ? (
                          <Trophy className="h-4 w-4 text-yellow-500 inline" />
                        ) : (
                          `#${i + 1}`
                        )}
                      </span>
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={m.profile!.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {m.profile!.display_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium flex-1">
                        {m.profile!.display_name}
                      </span>
                      <Badge variant="secondary">{m.count} poops</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Poop Highlights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Poop Highlights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {highestRatedPooper && (
                  <StatCard
                    icon={<Star className="h-4 w-4 text-yellow-500" />}
                    title="Highest Rated Pooper"
                    profile={highestRatedPooper.profile}
                    value={`${highestRatedPooper.avg.toFixed(1)}/5 avg rating`}
                  />
                )}
                {bestPoopStreak && bestPoopStreak.streak > 1 && (
                  <StatCard
                    icon={<Zap className="h-4 w-4 text-amber-500" />}
                    title="Best Poop Streak"
                    profile={bestPoopStreak.profile}
                    value={`${bestPoopStreak.streak} days in a row`}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Poop Places */}
          {topPoopPlaces.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Top Poop Places
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topPoopPlaces.map(([place, count], i) => (
                    <div
                      key={place}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      <span className="text-sm font-medium text-muted-foreground w-6 text-right">
                        #{i + 1}
                      </span>
                      <span className="text-sm font-medium flex-1">
                        {place}
                      </span>
                      <Badge variant="secondary">{count} poops</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  title,
  profile,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  profile: MemberProfile;
  value: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={profile.avatar_url} />
          <AvatarFallback className="text-[10px]">
            {profile.display_name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{profile.display_name}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{value}</p>
    </div>
  );
}
