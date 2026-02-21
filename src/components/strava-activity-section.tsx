"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  Bike,
  Waves,
  Mountain,
  Dumbbell,
  ExternalLink,
  Link2,
  Loader2,
  X,
  Trash2,
  Timer,
  Ruler,
  TrendingUp,
} from "lucide-react";
import {
  logEventToStravaAction,
  linkStravaActivityAction,
  linkStravaActivityByUrlAction,
  unlinkStravaActivityAction,
  getMyStravaActivitiesAction,
  type StravaActivityLinkWithUser,
} from "@/app/actions/strava";
import {
  STRAVA_SPORT_TYPES,
  formatDuration,
  formatDistance,
  formatActivitySpeed,
  type StravaActivity,
} from "@/lib/strava";

// ─── Sport type icon mapping ──────────────────────────────────────────────────

function SportIcon({ sportType, className }: { sportType: string; className?: string }) {
  if (["Ride", "MountainBikeRide", "GravelRide", "EBikeRide", "VirtualRide"].includes(sportType))
    return <Bike className={className} />;
  if (["Swim"].includes(sportType))
    return <Waves className={className} />;
  if (["Hike", "RockClimbing"].includes(sportType))
    return <Mountain className={className} />;
  if (["WeightTraining", "HighIntensityIntervalTraining"].includes(sportType))
    return <Dumbbell className={className} />;
  return <Activity className={className} />;
}

function sportLabel(value: string): string {
  return STRAVA_SPORT_TYPES.find((t) => t.value === value)?.label ?? value;
}

// ─── Activity stat card ───────────────────────────────────────────────────────

function ActivityCard({
  link,
  isOwn,
  onUnlink,
}: {
  link: StravaActivityLinkWithUser;
  isOwn: boolean;
  onUnlink: () => void;
}) {
  const [unlinking, setUnlinking] = useState(false);

  const handleUnlink = async () => {
    if (!confirm("Remove this Strava activity link?")) return;
    setUnlinking(true);
    await onUnlink();
    setUnlinking(false);
  };

  return (
    <div className="flex gap-3 p-3 rounded-lg border border-border bg-card group">
      {/* Sport icon */}
      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
        <SportIcon sportType={link.sport_type} className="h-5 w-5 text-orange-500" />
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug truncate">{link.activity_name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Avatar className="h-4 w-4">
                <AvatarImage src={link.user.avatar_url} />
                <AvatarFallback className="text-[8px]">
                  {link.user.display_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{link.user.display_name}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                {sportLabel(link.sport_type)}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <a
              href={`https://www.strava.com/activities/${link.strava_activity_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="icon" variant="ghost" className="h-7 w-7" title="View on Strava">
                <ExternalLink className="h-3.5 w-3.5 text-orange-500" />
              </Button>
            </a>
            {isOwn && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleUnlink}
                disabled={unlinking}
                title="Remove link"
              >
                {unlinking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Timer className="h-3 w-3" />
            {formatDuration(link.elapsed_time)}
          </span>
          {link.distance && link.distance > 0 && (
            <span className="flex items-center gap-1">
              <Ruler className="h-3 w-3" />
              {formatDistance(link.distance)}
            </span>
          )}
          {link.total_elevation_gain && link.total_elevation_gain > 0 && (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {Math.round(link.total_elevation_gain)} m
            </span>
          )}
          {link.average_speed && link.average_speed > 0 && link.distance && link.distance > 0 && (
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {formatActivitySpeed(link.average_speed, link.sport_type)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Log to Strava dialog ─────────────────────────────────────────────────────

function LogToStravaDialog({
  eventId,
  open,
  onOpenChange,
  onSuccess,
}: {
  eventId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [sportType, setSportType] = useState("Run");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    const result = await logEventToStravaAction(eventId, sportType);
    if (result.success) {
      onOpenChange(false);
      onSuccess();
    } else {
      setError(result.error ?? "Failed to log activity");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader className="flex-row items-center justify-between pr-0">
          <DialogTitle>Log Event to Strava</DialogTitle>
          <DialogClose asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="sport-type-log">Sport type</Label>
            <select
              id="sport-type-log"
              value={sportType}
              onChange={(e) => setSportType(e.target.value)}
              className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {STRAVA_SPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            Creates a manual Strava activity using the event&apos;s title, date, and
            duration.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSubmit} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Logging…</>
            ) : (
              "Log to Strava"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Link Activity dialog ─────────────────────────────────────────────────────

function LinkActivityDialog({
  eventId,
  open,
  onOpenChange,
  onSuccess,
}: {
  eventId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setActivitiesLoading(true);
    setActivitiesError(null);
    getMyStravaActivitiesAction().then(({ activities: acts, error }) => {
      setActivities(acts);
      if (error) setActivitiesError(error);
      setActivitiesLoading(false);
    });
  }, [open]);

  const handleSelectActivity = async (activityId: number) => {
    setLinking(true);
    setLinkError(null);
    const result = await linkStravaActivityAction(eventId, activityId);
    if (result.success) {
      onOpenChange(false);
      onSuccess();
    } else {
      setLinkError(result.error ?? "Failed to link activity");
    }
    setLinking(false);
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    setLinking(true);
    setLinkError(null);
    const result = await linkStravaActivityByUrlAction(eventId, urlInput.trim());
    if (result.success) {
      onOpenChange(false);
      onSuccess();
    } else {
      setLinkError(result.error ?? "Failed to link activity");
    }
    setLinking(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-md p-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-base font-semibold">Link Strava Activity</DialogTitle>
          <DialogClose asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>

        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="w-full rounded-none border-b border-border bg-transparent h-10 px-5 gap-4 justify-start">
            <TabsTrigger value="browse" className="text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0">
              Browse recent
            </TabsTrigger>
            <TabsTrigger value="url" className="text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0">
              Paste URL / ID
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="mt-0">
            <ScrollArea className="max-h-80">
              {activitiesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : activitiesError ? (
                <p className="text-sm text-destructive text-center py-6 px-4">
                  {activitiesError}
                </p>
              ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 px-4">
                  No recent activities found.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {activities.map((act) => (
                    <button
                      key={act.id}
                      onClick={() => handleSelectActivity(act.id)}
                      disabled={linking}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted transition-colors text-left disabled:opacity-50"
                    >
                      <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                        <SportIcon sportType={act.sport_type} className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{act.name}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{sportLabel(act.sport_type)}</span>
                          <span>·</span>
                          <span>{formatDuration(act.elapsed_time)}</span>
                          {act.distance > 0 && (
                            <>
                              <span>·</span>
                              <span>{formatDistance(act.distance)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="url" className="mt-0 px-5 py-4 space-y-3">
            <div>
              <Label htmlFor="strava-url">Strava activity URL or ID</Label>
              <Input
                id="strava-url"
                placeholder="https://www.strava.com/activities/12345678"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="mt-1.5"
              />
            </div>
            {linkError && <p className="text-sm text-destructive">{linkError}</p>}
            <Button
              onClick={handleUrlSubmit}
              disabled={linking || !urlInput.trim()}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {linking ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Linking…</>
              ) : (
                "Link Activity"
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {linkError && (
          <p className="text-sm text-destructive px-5 pb-4">{linkError}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main section component ───────────────────────────────────────────────────

interface StravaActivitySectionProps {
  eventId: string;
  initialLinks: StravaActivityLinkWithUser[];
  currentProfileId: string;
  isEligible: boolean; // past event + RSVPed yes
  hasStravaToken: boolean;
  stravaAuthUrl: string;
  hasSportCategory: boolean; // show "Log to Strava" only for sport events
}

export function StravaActivitySection({
  eventId,
  initialLinks,
  currentProfileId,
  isEligible,
  hasStravaToken,
  stravaAuthUrl,
  hasSportCategory,
}: StravaActivitySectionProps) {
  const [links, setLinks] = useState(initialLinks);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const myLink = links.find((l) => l.user_id === currentProfileId);

  const handleSuccess = async () => {
    // Re-fetch links from server by navigating is handled by revalidatePath;
    // for optimistic refresh we reload the section data
    const { getEventStravaLinksAction } = await import("@/app/actions/strava");
    const fresh = await getEventStravaLinksAction(eventId);
    setLinks(fresh);
  };

  const handleUnlink = async (link: StravaActivityLinkWithUser) => {
    await unlinkStravaActivityAction(link.event_id);
    setLinks((prev) => prev.filter((l) => l.id !== link.id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            Strava Activities
            {links.length > 0 && (
              <Badge variant="secondary">{links.length}</Badge>
            )}
          </span>

          {isEligible && hasStravaToken && !myLink && (
            <div className="flex items-center gap-2">
              {hasSportCategory && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => setLogDialogOpen(true)}
                >
                  <Activity className="mr-1.5 h-3.5 w-3.5 text-orange-500" />
                  Log to Strava
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setLinkDialogOpen(true)}
              >
                <Link2 className="mr-1.5 h-3.5 w-3.5" />
                Link Activity
              </Button>
            </div>
          )}

          {isEligible && !hasStravaToken && (
            <a href={stravaAuthUrl}>
              <Button size="sm" className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white">
                Connect Strava
              </Button>
            </a>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {isEligible
              ? "No activities linked yet. Log or link your Strava activity!"
              : "No Strava activities linked to this event."}
          </p>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <ActivityCard
                key={link.id}
                link={link}
                isOwn={link.user_id === currentProfileId}
                onUnlink={() => handleUnlink(link)}
              />
            ))}
          </div>
        )}
      </CardContent>

      <LogToStravaDialog
        eventId={eventId}
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
        onSuccess={handleSuccess}
      />
      <LinkActivityDialog
        eventId={eventId}
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        onSuccess={handleSuccess}
      />
    </Card>
  );
}
