import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Plus, Users, ExternalLink, Pin } from "lucide-react";
import Link from "next/link";
import { RsvpStatus } from "@/lib/types";
import { Fab } from "@/components/fab";

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
    .select("*, creator:profiles!events_created_by_fkey(id, display_name, avatar_url)")
    .gte("date", new Date().toISOString())
    .order("is_pinned", { ascending: false })
    .order("date", { ascending: true })
    .limit(5);
  const events = rawEvents;

  // Fetch RSVPs for these events
  const eventIds = (events ?? []).map((e) => e.id);
  const { data: rsvps } = eventIds.length
    ? await supabase
        .from("rsvps")
        .select("*, user:profiles!rsvps_user_id_fkey(id, display_name, avatar_url)")
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
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 underline hover:text-foreground transition-colors"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              {event.location}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {yes} going{guestTotal > 0 && ` (+${guestTotal} guest${guestTotal !== 1 ? "s" : ""})`} &middot; {maybe} maybe
                          </p>
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

      <Fab href="/events/new" />
    </div>
  );
}
