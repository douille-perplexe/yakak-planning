"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Star, MapPin, MessageSquare } from "lucide-react";
import { PoopMapPoop } from "@/lib/types";

interface PoopMapFeedProps {
  poops: PoopMapPoop[];
  currentUserId?: number;
}

function formatTimestamp(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function RatingStars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export function PoopMapFeed({ poops, currentUserId }: PoopMapFeedProps) {
  const sorted = [...poops].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No poops in the feed yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((poop) => {
        const isOwn =
          currentUserId != null && poop.user_id === currentUserId;
        return (
          <Card key={poop.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {poop.username}
                    {isOwn && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        You
                      </span>
                    )}
                  </p>
                  {poop.place && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {poop.place}
                    </p>
                  )}
                  {poop.note && (
                    <p className="text-sm text-foreground">{poop.note}</p>
                  )}
                  <div className="flex items-center gap-3 pt-1">
                    <RatingStars rating={poop.rating} />
                    {poop.comments_count > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {poop.comments_count}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatTimestamp(poop.created_at)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
