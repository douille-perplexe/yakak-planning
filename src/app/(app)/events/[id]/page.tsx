import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Clock, ArrowLeft, Euro, ExternalLink, Pin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RsvpButtons } from "@/components/rsvp-buttons";
import { EventActions } from "@/components/event-actions";
import { PinToggleButton } from "@/components/pin-toggle-button";
import { CommentThread } from "@/components/comment-thread";
import { PollCard } from "@/components/poll-card";
import { CreatePollForm } from "@/components/create-poll-form";
import {
  Profile,
  RsvpStatus,
  CommentWithUser,
  PollWithDetails,
  ActivityCategory,
  FeaturedBadge,
} from "@/lib/types";
import {
  getCategoryIcon,
  getCategoryColorClass,
} from "@/lib/category-utils";
import { AchievementBadge } from "@/components/achievement-badge";

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
      "*, creator:profiles!events_created_by_fkey(id, display_name, avatar_url, featured_badge:achievement_definitions(id, name, icon, tier))"
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

  // Fetch event categories with join to activity_categories
  const { data: eventCategories } = await supabase
    .from("event_categories")
    .select("category_id, category:activity_categories(*)")
    .eq("event_id", id);

  const eventCategoryIds = (eventCategories ?? []).map(
    (ec) => ec.category_id
  );
  const categoryDetails = (eventCategories ?? [])
    .map((ec) => ec.category as unknown as ActivityCategory)
    .filter(Boolean)
    .sort((a, b) => a.position - b.position);

  // Fetch all categories for the edit dialog
  const { data: allCategories } = await supabase
    .from("activity_categories")
    .select("*")
    .order("position", { ascending: true });

  // Fetch RSVPs with user profiles
  const { data: rsvps } = await supabase
    .from("rsvps")
    .select(
      "*, user:profiles!rsvps_user_id_fkey(id, display_name, avatar_url, featured_badge:achievement_definitions(id, name, icon, tier))"
    )
    .eq("event_id", id);

  // Fetch all approved members for "No response" section
  const { data: allMembers } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, featured_badge:achievement_definitions(id, name, icon, tier)")
    .eq("status", "approved");

  // Fetch comments with user profiles
  const { data: comments } = await supabase
    .from("comments")
    .select(
      "*, user:profiles!comments_user_id_fkey(id, display_name, avatar_url, featured_badge:achievement_definitions(id, name, icon, tier))"
    )
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  // Fetch reactions for comments
  const commentIds = (comments ?? []).map((c) => c.id);
  const { data: reactions } = commentIds.length
    ? await supabase
        .from("reactions")
        .select("*")
        .in("comment_id", commentIds)
    : { data: [] };

  // Assemble comments with reaction groups
  const commentsWithReactions: CommentWithUser[] = (comments ?? []).map((c) => {
    const commentReactions = (reactions ?? []).filter(
      (r) => r.comment_id === c.id
    );
    // Group by emoji
    const emojiMap = new Map<string, { count: number; reacted_by_me: boolean }>();
    for (const r of commentReactions) {
      const existing = emojiMap.get(r.emoji);
      if (existing) {
        existing.count++;
        if (r.user_id === currentProfile?.id) existing.reacted_by_me = true;
      } else {
        emojiMap.set(r.emoji, {
          count: 1,
          reacted_by_me: r.user_id === currentProfile?.id,
        });
      }
    }
    return {
      ...c,
      user: c.user,
      reactions: Array.from(emojiMap.entries()).map(([emoji, data]) => ({
        emoji,
        ...data,
      })),
    } as unknown as CommentWithUser;
  });

  // Fetch polls with options and votes
  const { data: rawPolls } = await supabase
    .from("polls")
    .select(
      "*, creator:profiles!polls_user_id_fkey(id, display_name)"
    )
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  const { data: allOptions } = rawPolls?.length
    ? await supabase
        .from("poll_options")
        .select("*")
        .in("poll_id", rawPolls.map((p) => p.id))
        .order("position", { ascending: true })
    : { data: [] };

  const { data: allVotes } = rawPolls?.length
    ? await supabase
        .from("poll_votes")
        .select("*")
        .in("poll_id", rawPolls.map((p) => p.id))
    : { data: [] };

  const rsvpList = rsvps ?? [];
  const members = allMembers ?? [];

  const yesRsvps = rsvpList.filter((r) => r.status === "yes");
  const maybeRsvps = rsvpList.filter((r) => r.status === "maybe");
  const noRsvps = rsvpList.filter((r) => r.status === "no");
  const respondedIds = new Set(rsvpList.map((r) => r.user_id));
  const noResponse = members.filter((m) => !respondedIds.has(m.id));

  const currentUserRsvp = rsvpList.find(
    (r) => r.user_id === currentProfile?.id
  );
  const userRsvp = currentUserRsvp?.status as RsvpStatus | undefined;
  const userGuestCount = currentUserRsvp?.guest_count ?? 0;

  const yesGuestTotal = yesRsvps.reduce((sum, r) => sum + (r.guest_count ?? 0), 0);

  const isCreator = event.created_by === currentProfile?.id;
  const isAdmin = currentProfile?.role === "admin";

  // Assemble polls with their options and votes
  const polls: PollWithDetails[] = (rawPolls ?? []).map((poll) => {
    const pollOptions = (allOptions ?? []).filter((o) => o.poll_id === poll.id);
    const pollVotes = (allVotes ?? []).filter((v) => v.poll_id === poll.id);
    const userVote = pollVotes.find(
      (v) => v.user_id === currentProfile?.id
    );

    return {
      ...poll,
      creator: poll.creator as unknown as Pick<Profile, "id" | "display_name">,
      options: pollOptions.map((o) => ({
        ...o,
        vote_count: pollVotes.filter((v) => v.option_id === o.id).length,
      })),
      user_vote: userVote?.option_id ?? null,
      total_votes: pollVotes.length,
    };
  });

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
  > & { featured_badge: FeaturedBadge | null };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <PinToggleButton eventId={event.id} isPinned={event.is_pinned} />
          )}
          {(isCreator || isAdmin) && (
            <EventActions
              eventId={event.id}
              event={event}
              isCreator={isCreator}
              isAdmin={isAdmin}
              categories={(allCategories ?? []) as ActivityCategory[]}
              eventCategoryIds={eventCategoryIds}
            />
          )}
        </div>
      </div>

      {/* Event details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            {event.is_pinned && <Pin className="h-5 w-5 text-primary" />}
            {event.title}
            {event.is_pinned && <Badge variant="outline" className="text-xs border-primary/50 text-primary">Pinned</Badge>}
          </CardTitle>
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
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                {event.location}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Reminder {event.reminder_hours}h before</span>
            </div>
          </div>

          {/* Categories */}
          {categoryDetails.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categoryDetails.map((cat) => {
                const Icon = getCategoryIcon(cat.icon);
                return (
                  <Badge
                    key={cat.id}
                    className={
                      getCategoryColorClass(cat.color) + " border"
                    }
                  >
                    <Icon className="h-3 w-3" />
                    {cat.name}
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Cost */}
          {event.estimated_cost != null && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Euro className="h-4 w-4" />
              <span>~{Number(event.estimated_cost).toFixed(2)} EUR</span>
            </div>
          )}

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
            <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
              Created by {creator.display_name}
              <AchievementBadge badge={creator.featured_badge} />
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
              <Badge variant="default">
                {yesRsvps.length} going{yesGuestTotal > 0 && ` (+${yesGuestTotal} guest${yesGuestTotal !== 1 ? "s" : ""})`}
              </Badge>
              <Badge variant="secondary">{maybeRsvps.length} maybe</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <RsvpButtons
            eventId={event.id}
            currentStatus={userRsvp ?? null}
            currentGuestCount={userGuestCount}
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
                  > & { featured_badge: FeaturedBadge | null };
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
                      <span className="text-sm inline-flex items-center gap-1">
                        {rsvpUser.display_name}
                        <AchievementBadge badge={rsvpUser.featured_badge} />
                        {rsvp.guest_count > 0 && (
                          <span className="text-muted-foreground ml-1">
                            +{rsvp.guest_count} guest{rsvp.guest_count !== 1 ? "s" : ""}
                          </span>
                        )}
                      </span>
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
                  > & { featured_badge: FeaturedBadge | null };
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
                      <span className="text-sm inline-flex items-center gap-1">
                        {rsvpUser.display_name}
                        <AchievementBadge badge={rsvpUser.featured_badge} />
                        {rsvp.guest_count > 0 && (
                          <span className="text-muted-foreground ml-1">
                            +{rsvp.guest_count} guest{rsvp.guest_count !== 1 ? "s" : ""}
                          </span>
                        )}
                      </span>
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
                  > & { featured_badge: FeaturedBadge | null };
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
                      <span className="text-sm inline-flex items-center gap-1">
                        {rsvpUser.display_name}
                        <AchievementBadge badge={rsvpUser.featured_badge} />
                      </span>
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
                {noResponse.map((member) => {
                  const m = member as typeof member & { featured_badge: FeaturedBadge | null };
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 bg-muted rounded-full px-3 py-1 opacity-40"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={m.avatar_url} />
                        <AvatarFallback className="text-[10px]">
                          {m.display_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm inline-flex items-center gap-1">
                        {m.display_name}
                        <AchievementBadge badge={m.featured_badge} />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Polls section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              Polls
              {polls.length > 0 && (
                <Badge variant="secondary">{polls.length}</Badge>
              )}
            </span>
            <CreatePollForm eventId={event.id} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {polls.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No polls yet. Create one to help decide!
            </p>
          ) : (
            <div className="space-y-4">
              {polls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  eventId={event.id}
                  currentProfileId={currentProfile?.id ?? ""}
                />
              ))}
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
            comments={commentsWithReactions}
            currentProfileId={currentProfile?.id ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
