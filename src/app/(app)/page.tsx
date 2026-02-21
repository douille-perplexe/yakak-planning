import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus, Users, Pin } from "lucide-react";
import Link from "next/link";
import { Fab } from "@/components/fab";
import { MapLink } from "@/components/map-link";
import { RsvpStatus, TwitchChannel, PoopMapToken, PoopMapPoop } from "@/lib/types";
import { TwitchLiveCard } from "@/components/twitch-live-card";
import { fetchLiveStatuses, syncTwitchChannels } from "@/lib/twitch";
import { PoopMapWidget } from "@/components/poopmap-widget";
import { fetchFeed as fetchPoopFeed } from "@/lib/poopmap";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user!.id)
    .single();

  // Fetch upcoming events (next 5), pinned first
  const { data: rawEvents } = await supabase
    .from("events")
    .select("*, creator:profiles!events_created_by_fkey(id, display_name, avatar_url, featured_badge:achievement_definitions(id, name, icon, tier))")
    .gte("date", new Date().toISOString())
    .order("date", { ascending: true })
    .limit(5);
  // Sort pinned events to the top (client-side so it works before migration runs)
  const events = (rawEvents ?? []).sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return 0;
  });

  // Fetch RSVPs for these events
  const eventIds = (events ?? []).map((e) => e.id);
  const { data: rsvps } = eventIds.length
    ? await supabase
        .from("rsvps")
        .select("*, user:profiles!rsvps_user_id_fkey(id, display_name, avatar_url, featured_badge:achievement_definitions(id, name, icon, tier))")
        .in("event_id", eventIds)
    : { data: [] };

  // Fetch stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count: eventsThisMonth } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .gte("date", startOfMonth);

  const { count: eventsAllTime } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true });

  const { count: totalMembers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved");

  // Fetch twitch channels and their real-time live status from Twitch API
  const { data: twitchChannels } = await supabase
    .from("twitch_channels")
    .select("*")
    .order("created_at", { ascending: true });

  // Fetch Poop Map token + feed for widget
  const { data: poopMapTokenRow } = await supabase
    .from("poopmap_tokens")
    .select("*")
    .eq("user_id", profile!.id)
    .single();

  const poopMapToken = poopMapTokenRow as PoopMapToken | null;
  let poopMapFeed: PoopMapPoop[] = [];
  if (poopMapToken) {
    try {
      poopMapFeed = await fetchPoopFeed(poopMapToken.device_token);
    } catch {
      // API error — show empty
    }
  }

  const channelNames = (twitchChannels ?? []).map((c: { channel_name: string }) => c.channel_name);
  const liveStatuses = await fetchLiveStatuses(channelNames);

  // Sync Twitch state to DB + send notifications (fire-and-forget, replaces cron)
  if ((twitchChannels ?? []).length > 0) {
    syncTwitchChannels(twitchChannels as TwitchChannel[], liveStatuses).catch(
      (err) => console.error("[twitch-sync]", err)
    );
  }

  // Merge live data from Twitch API into channel objects
  const enrichedChannels: TwitchChannel[] = (twitchChannels ?? []).map((ch: TwitchChannel) => {
    const live = liveStatuses.get(ch.channel_name.toLowerCase());
    if (live) {
      return {
        ...ch,
        is_live: true,
        current_stream_id: live.id,
        current_title: live.title || ch.current_title,
        current_category: live.game_name || ch.current_category,
        current_viewer_count: live.viewer_count,
        current_thumbnail_url: live.thumbnail_url || ch.current_thumbnail_url,
        stream_started_at: live.started_at || ch.stream_started_at,
      };
    }
    return { ...ch, is_live: false };
  });

  const getRsvpSummary = (eventId: string) => {
    const eventRsvps = (rsvps ?? []).filter((r) => r.event_id === eventId);
    const yesRsvps = eventRsvps.filter((r) => r.status === "yes");
    const yes = yesRsvps.length;
    const maybe = eventRsvps.filter((r) => r.status === "maybe").length;
    const guestTotal = yesRsvps.reduce((sum, r) => sum + (r.guest_count ?? 0), 0);
    return { yes, maybe, guestTotal };
  };

  const getUserRsvp = (eventId: string): RsvpStatus | null => {
    const userRsvp = (rsvps ?? []).find(
      (r) => r.event_id === eventId && r.user_id === profile?.id
    );
    return (userRsvp?.status as RsvpStatus) ?? null;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const rsvpBadgeVariant = (status: RsvpStatus | null) => {
    switch (status) {
      case "yes":
        return "default" as const;
      case "maybe":
        return "secondary" as const;
      case "no":
        return "outline" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {profile?.display_name?.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s what&apos;s coming up
          </p>
        </div>
        <Link href="/events/new" className="hidden md:block">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Event
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                {eventsThisMonth ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                {eventsAllTime ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                {totalMembers ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <Users className="inline h-3 w-3 mr-1" />
                Members
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Twitch Live Streams — above events when someone is live */}
      {enrichedChannels.some((c) => c.is_live) && (
        <TwitchLiveCard channels={enrichedChannels} />
      )}

      {/* Upcoming Events */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Upcoming Events
        </h2>
        {!events || events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                No upcoming events &mdash; be the first to create one!
              </p>
              <Link href="/events/new" className="mt-4 inline-block">
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Event
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const { yes, maybe, guestTotal } = getRsvpSummary(event.id);
              const userRsvp = getUserRsvp(event.id);
              return (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <Card className={`hover:shadow-md transition-shadow cursor-pointer${event.is_pinned ? " border-primary/50 bg-primary/5" : ""}`}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-foreground flex items-center gap-2">
                            {event.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                            {event.title}
                            {event.is_pinned && <Badge variant="outline" className="text-xs border-primary/50 text-primary">Pinned</Badge>}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {formatDate(event.date)}
                            </span>
                            <MapLink location={event.location} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {yes} going{guestTotal > 0 && ` (+${guestTotal} guest${guestTotal !== 1 ? "s" : ""})`} &middot; {maybe} maybe
                          </p>
                          {event.creator && (
                            <Link
                              href={`/profile/${(event.creator as { id: string }).id}`}
                              className="text-xs text-muted-foreground hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              by {(event.creator as { display_name: string }).display_name}
                            </Link>
                          )}
                        </div>
                        {userRsvp && (
                          <Badge variant={rsvpBadgeVariant(userRsvp)}>
                            {userRsvp}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Poop Map Widget */}
      <PoopMapWidget poops={poopMapFeed} linked={!!poopMapToken} />

      {/* Twitch — below events when no one is live */}
      {!enrichedChannels.some((c) => c.is_live) && enrichedChannels.length > 0 && (
        <TwitchLiveCard channels={enrichedChannels} />
      )}

      <Fab href="/events/new" />
    </div>
  );
}
