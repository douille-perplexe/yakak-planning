import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  CalendarDays,
  Trophy,
  Users,
  Percent,
  Tag,
} from "lucide-react";
import { AchievementShowcase } from "@/components/achievement-showcase";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import {
  AchievementDefinition,
  UserAchievementWithDefinition,
  Profile,
  ActivityCategory,
} from "@/lib/types";
import { getCategoryIcon, getCategoryColorClass } from "@/lib/category-utils";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Parallel fetches
  const [
    { data: profileData },
    { data: currentUserProfile },
    { data: achievementDefs },
    { data: userAchievements },
    { data: allCategories },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single(),
    user
      ? supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from("achievement_definitions")
      .select("*")
      .order("achievement_group")
      .order("tier_position"),
    supabase
      .from("user_achievements")
      .select("*, achievement:achievement_definitions(*)")
      .eq("user_id", id),
    supabase
      .from("activity_categories")
      .select("*")
      .order("position", { ascending: true }),
  ]);

  if (!profileData) {
    notFound();
  }

  const profile = profileData as Profile & { featured_badge_id?: string | null };
  const isOwnProfile = currentUserProfile?.id === id;

  // Fetch past events attended (yes RSVPs) with their categories
  const now = new Date().toISOString();

  const [
    { data: yesRsvps, count: totalAttended },
    { data: createdEvents, count: totalCreated },
    { data: totalPastEventsData },
    { data: profileRecommendations },
  ] = await Promise.all([
    supabase
      .from("rsvps")
      .select(
        "event_id, events!inner(id, title, date, event_categories(category_id))",
        { count: "exact" }
      )
      .eq("user_id", id)
      .eq("status", "yes")
      .lt("events.date", now)
      .order("events(date)", { ascending: false })
      .limit(10),
    supabase
      .from("events")
      .select("id, title, date, event_categories(category_id, category:activity_categories(*))", { count: "exact" })
      .eq("created_by", id)
      .lt("date", now)
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .limit(10),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .lt("date", now)
      .is("deleted_at", null),
    supabase
      .from("recommendations")
      .select("*, recommendation_likes(user_id)")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const attended = (yesRsvps ?? []) as unknown as Array<{
    event_id: string;
    events: { id: string; title: string; date: string; event_categories: { category_id: string }[] };
  }>;

  const created = (createdEvents ?? []) as unknown as Array<{
    id: string;
    title: string;
    date: string;
    event_categories: { category_id: string; category: ActivityCategory }[];
  }>;

  const totalPastEvents = totalPastEventsData?.length ?? 0;

  // Compute favourite category
  const categoryFreq = new Map<string, number>();
  for (const rsvp of attended) {
    for (const ec of rsvp.events.event_categories ?? []) {
      categoryFreq.set(ec.category_id, (categoryFreq.get(ec.category_id) ?? 0) + 1);
    }
  }
  let favouriteCategoryId: string | null = null;
  let maxFreq = 0;
  for (const [catId, freq] of categoryFreq) {
    if (freq > maxFreq) {
      maxFreq = freq;
      favouriteCategoryId = catId;
    }
  }
  const categories = (allCategories ?? []) as ActivityCategory[];
  const favouriteCategory = favouriteCategoryId
    ? categories.find((c) => c.id === favouriteCategoryId) ?? null
    : null;

  const attendanceRate =
    totalPastEvents && totalPastEvents > 0
      ? ((totalAttended ?? 0) / totalPastEvents * 100).toFixed(0)
      : "0";

  const recommendations = (profileRecommendations ?? []).map((rec) => {
    const likes = (rec.recommendation_likes as { user_id: string }[]) ?? [];
    return {
      id: rec.id as string,
      title: rec.title as string,
      category: rec.category as string,
      image_url: rec.image_url as string | null,
      likes_count: likes.length,
    };
  });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Avatar className="h-20 w-20 flex-shrink-0">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-2xl">
                {profile.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {profile.display_name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary" className="capitalize">
                      {profile.role}
                    </Badge>
                  </div>
                </div>
                {isOwnProfile && <EditProfileDialog profile={profile} />}
              </div>

              {profile.bio && (
                <p className="text-sm text-muted-foreground mt-2">
                  {profile.bio}
                </p>
              )}

              <p className="text-xs text-muted-foreground mt-2">
                Member since {memberSince}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 pb-4 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalAttended ?? 0}</p>
            <p className="text-xs text-muted-foreground">Events attended</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 pb-4 text-center">
            <CalendarDays className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalCreated ?? 0}</p>
            <p className="text-xs text-muted-foreground">Events created</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 pb-4 text-center">
            {favouriteCategory ? (
              <>
                {(() => {
                  const Icon = getCategoryIcon(favouriteCategory.icon);
                  return <Icon className="h-5 w-5 text-primary mx-auto mb-1" />;
                })()}
                <p className="text-sm font-bold truncate">{favouriteCategory.name}</p>
                <p className="text-xs text-muted-foreground">Fav category</p>
              </>
            ) : (
              <>
                <Percent className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold">{attendanceRate}%</p>
                <p className="text-xs text-muted-foreground">Attendance rate</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <AchievementShowcase
        allDefinitions={(achievementDefs ?? []) as AchievementDefinition[]}
        userAchievements={(userAchievements ?? []) as UserAchievementWithDefinition[]}
        currentFeaturedId={profile.featured_badge_id ?? null}
        readOnly={!isOwnProfile}
      />

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="attended">
            <TabsList className="mb-4">
              <TabsTrigger value="attended">Attended</TabsTrigger>
              <TabsTrigger value="organized">Organized</TabsTrigger>
            </TabsList>

            <TabsContent value="attended">
              {attended.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No past events attended yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {attended.map((rsvp) => (
                    <Link
                      key={rsvp.event_id}
                      href={`/events/${rsvp.event_id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {rsvp.events.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(rsvp.events.date)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="organized">
              {created.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No past events organized yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {created.map((event) => {
                    const eventCats = (event.event_categories ?? [])
                      .map((ec) => ec.category)
                      .filter(Boolean) as ActivityCategory[];
                    return (
                      <Link
                        key={event.id}
                        href={`/events/${event.id}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {event.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(event.date)}
                            </span>
                            {eventCats.slice(0, 2).map((cat) => {
                              const Icon = getCategoryIcon(cat.icon);
                              return (
                                <Badge
                                  key={cat.id}
                                  className={getCategoryColorClass(cat.color) + " border text-[10px] h-4 px-1"}
                                >
                                  <Icon className="h-2.5 w-2.5 mr-0.5" />
                                  {cat.name}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{recommendations.length} recommendation{recommendations.length !== 1 ? "s" : ""}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {recommendations.map((rec) => {
                const Icon = Tag;
                return (
                  <div
                    key={rec.id}
                    className="flex flex-col gap-1 rounded-lg overflow-hidden border border-border"
                  >
                    {rec.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={rec.image_url}
                        alt={rec.title}
                        className="w-full aspect-[2/3] object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
                        <Icon className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="px-2 pb-2">
                      <p className="text-xs font-medium line-clamp-1">{rec.title}</p>
                      <p className="text-[10px] text-muted-foreground">{rec.category}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
