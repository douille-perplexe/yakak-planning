import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RsvpButtons } from "@/components/rsvp-buttons";
import { EventActions } from "@/components/event-actions";
import { CommentThread } from "@/components/comment-thread";
import { Profile, RsvpStatus, CommentWithUser } from "@/lib/types";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user!.id)
    .single();

  // Fetch event with creator
  const { data: event } = await supabase
    .from("events")
    .select(
      "*, creator:profiles!events_created_by_fkey(id, display_name, avatar_url)"
    )
    .eq("id", id)
    .single();

  if (!event) {
    notFound();
  }

  // Check if soft-deleted
  if (event.deleted_at) {
    return (
      <div className="space-y-6">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              This event has been cancelled.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch RSVPs with user profiles
  const { data: rsvps } = await supabase
    .from("rsvps")
    .select(
      "*, user:profiles!rsvps_user_id_fkey(id, display_name, avatar_url)"
    )
    .eq("event_id", id);

  // Fetch all approved members for "No response" section
  const { data: allMembers } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("status", "approved");

  // Fetch comments with user profiles
  const { data: comments } = await supabase
    .from("comments")
    .select(
      "*, user:profiles!comments_user_id_fkey(id, display_name, avatar_url)"
    )
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  const rsvpList = rsvps ?? [];
  const members = allMembers ?? [];

  const yesRsvps = rsvpList.filter((r) => r.status === "yes");
  const maybeRsvps = rsvpList.filter((r) => r.status === "maybe");
  const noRsvps = rsvpList.filter((r) => r.status === "no");
  const respondedIds = new Set(rsvpList.map((r) => r.user_id));
  const noResponse = members.filter((m) => !respondedIds.has(m.id));

  const userRsvp = rsvpList.find(
    (r) => r.user_id === currentProfile?.id
  )?.status as RsvpStatus | undefined;

  const isCreator = event.created_by === currentProfile?.id;
  const isAdmin = currentProfile?.role === "admin";

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const creator = event.creator as unknown as Pick<
    Profile,
    "id" | "display_name" | "avatar_url"
  >;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        {(isCreator || isAdmin) && (
          <EventActions
            eventId={event.id}
            event={event}
            isCreator={isCreator}
            isAdmin={isAdmin}
          />
        )}
      </div>

      {/* Event details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{event.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>
                {formatDate(event.date)} at {formatTime(event.date)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Reminder {event.reminder_hours}h before</span>
            </div>
          </div>

          {event.description && (
            <p className="text-foreground mt-4">{event.description}</p>
          )}

          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
            <Avatar className="h-6 w-6">
              <AvatarImage src={creator.avatar_url} />
              <AvatarFallback>
                {creator.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              Created by {creator.display_name}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* RSVP section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            RSVP
            <div className="flex gap-2">
              <Badge variant="default">{yesRsvps.length} going</Badge>
              <Badge variant="secondary">{maybeRsvps.length} maybe</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <RsvpButtons
            eventId={event.id}
            currentStatus={userRsvp ?? null}
          />

          {/* RSVP lists */}
          {yesRsvps.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Going ({yesRsvps.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {yesRsvps.map((rsvp) => {
                  const rsvpUser = rsvp.user as unknown as Pick<
                    Profile,
                    "id" | "display_name" | "avatar_url"
                  >;
                  return (
                    <div
                      key={rsvp.id}
                      className="flex items-center gap-2 bg-muted rounded-full px-3 py-1"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={rsvpUser.avatar_url} />
                        <AvatarFallback className="text-[10px]">
                          {rsvpUser.display_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{rsvpUser.display_name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {maybeRsvps.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Maybe ({maybeRsvps.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {maybeRsvps.map((rsvp) => {
                  const rsvpUser = rsvp.user as unknown as Pick<
                    Profile,
                    "id" | "display_name" | "avatar_url"
                  >;
                  return (
                    <div
                      key={rsvp.id}
                      className="flex items-center gap-2 bg-muted rounded-full px-3 py-1"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={rsvpUser.avatar_url} />
                        <AvatarFallback className="text-[10px]">
                          {rsvpUser.display_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{rsvpUser.display_name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {noRsvps.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Not going ({noRsvps.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {noRsvps.map((rsvp) => {
                  const rsvpUser = rsvp.user as unknown as Pick<
                    Profile,
                    "id" | "display_name" | "avatar_url"
                  >;
                  return (
                    <div
                      key={rsvp.id}
                      className="flex items-center gap-2 bg-muted rounded-full px-3 py-1 opacity-60"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={rsvpUser.avatar_url} />
                        <AvatarFallback className="text-[10px]">
                          {rsvpUser.display_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{rsvpUser.display_name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {noResponse.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                No response ({noResponse.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {noResponse.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 bg-muted rounded-full px-3 py-1 opacity-40"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={member.avatar_url} />
                      <AvatarFallback className="text-[10px]">
                        {member.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{member.display_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Discussion
            {(comments?.length ?? 0) > 0 && (
              <Badge variant="secondary">{comments!.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CommentThread
            eventId={event.id}
            comments={(comments ?? []) as unknown as CommentWithUser[]}
            currentProfileId={currentProfile?.id ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
