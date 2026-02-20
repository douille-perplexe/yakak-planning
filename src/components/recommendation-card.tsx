"use client";

import { useState } from "react";
import {
  Film,
  Tv,
  Sparkles,
  Gamepad2,
  Music,
  BookOpen,
  MapPin,
  Utensils,
  Activity,
  Mic,
  MoreHorizontal,
  Heart,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Trash2,
  Star,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toggleLike, saveRecommendation, removeSavedRecommendation, toggleConsumed } from "@/app/actions/recommendations";
import type {
  RecommendationCategory,
  RecommendationSource,
  RecommendationWithUser,
  SavedRecommendation,
  ApiRecommendation,
} from "@/lib/types";

export const CATEGORY_ICONS: Record<RecommendationCategory, React.ElementType> = {
  Movies: Film,
  "TV Series": Tv,
  Anime: Sparkles,
  Games: Gamepad2,
  Music: Music,
  Books: BookOpen,
  Outings: MapPin,
  Restaurants: Utensils,
  Activities: Activity,
  Podcasts: Mic,
  Other: MoreHorizontal,
};

export const CATEGORY_COLORS: Record<
  RecommendationCategory,
  { pill: string; accent: string; border: string }
> = {
  Movies: {
    pill: "bg-blue-100 text-blue-700 border-blue-200",
    accent: "bg-blue-500",
    border: "border-l-blue-500",
  },
  "TV Series": {
    pill: "bg-purple-100 text-purple-700 border-purple-200",
    accent: "bg-purple-500",
    border: "border-l-purple-500",
  },
  Anime: {
    pill: "bg-pink-100 text-pink-700 border-pink-200",
    accent: "bg-pink-500",
    border: "border-l-pink-500",
  },
  Games: {
    pill: "bg-green-100 text-green-700 border-green-200",
    accent: "bg-green-500",
    border: "border-l-green-500",
  },
  Music: {
    pill: "bg-amber-100 text-amber-700 border-amber-200",
    accent: "bg-amber-500",
    border: "border-l-amber-500",
  },
  Books: {
    pill: "bg-orange-100 text-orange-700 border-orange-200",
    accent: "bg-orange-500",
    border: "border-l-orange-500",
  },
  Outings: {
    pill: "bg-teal-100 text-teal-700 border-teal-200",
    accent: "bg-teal-500",
    border: "border-l-teal-500",
  },
  Restaurants: {
    pill: "bg-red-100 text-red-700 border-red-200",
    accent: "bg-red-500",
    border: "border-l-red-500",
  },
  Activities: {
    pill: "bg-lime-100 text-lime-700 border-lime-200",
    accent: "bg-lime-500",
    border: "border-l-lime-500",
  },
  Podcasts: {
    pill: "bg-cyan-100 text-cyan-700 border-cyan-200",
    accent: "bg-cyan-500",
    border: "border-l-cyan-500",
  },
  Other: {
    pill: "bg-slate-100 text-slate-700 border-slate-200",
    accent: "bg-slate-500",
    border: "border-l-slate-500",
  },
};

const SOURCE_LABELS: Record<RecommendationSource, string> = {
  manual: "User",
  tmdb: "TMDB",
  rawg: "RAWG",
  spotify: "Spotify",
  google_books: "Google Books",
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ─── API Card ────────────────────────────────────────────

export function ApiRecommendationCard({
  rec,
  onSaved,
}: {
  rec: ApiRecommendation;
  onSaved?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const CategoryIcon = CATEGORY_ICONS[rec.category];
  const colors = CATEGORY_COLORS[rec.category];

  const handleSave = async () => {
    if (saving || saved) return;
    setSaving(true);
    const result = await saveRecommendation({
      title: rec.title,
      description: rec.description,
      category: rec.category,
      image_url: rec.image_url,
      external_url: rec.external_url,
      source: rec.source,
      source_id: rec.source_id,
    });
    if (result.success) {
      setSaved(true);
      onSaved?.();
    }
    setSaving(false);
  };

  return (
    <Card className="overflow-hidden">
      <div className={`h-1 w-full ${colors.accent}`} />
      {rec.image_url && (
        <div className="aspect-[2/3] overflow-hidden bg-muted">
          <img
            src={rec.image_url}
            alt={rec.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">
            {rec.title}
          </h3>
          {rec.rating != null && (
            <div className="flex items-center gap-0.5 text-xs text-amber-500 shrink-0">
              <Star className="h-3 w-3 fill-current" />
              {rec.rating.toFixed(1)}
            </div>
          )}
        </div>

        {rec.description && (
          <p className="text-xs text-muted-foreground line-clamp-3">
            {rec.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CategoryIcon className="h-3 w-3" />
          <span>{rec.category}</span>
          <span className="text-muted-foreground/50">·</span>
          <span>{SOURCE_LABELS[rec.source]}</span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          {rec.external_url && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <a href={rec.external_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </a>
            </Button>
          )}
          <Button
            variant={saved ? "secondary" : "outline"}
            size="sm"
            className="h-7 text-xs ml-auto"
            onClick={handleSave}
            disabled={saving || saved}
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : saved ? (
              <BookmarkCheck className="h-3 w-3 mr-1" />
            ) : (
              <Bookmark className="h-3 w-3 mr-1" />
            )}
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── User Recommendation Card ────────────────────────────

export function UserRecommendationCard({
  rec,
}: {
  rec: RecommendationWithUser;
}) {
  const [liking, setLiking] = useState(false);
  const [liked, setLiked] = useState(rec.liked_by_me);
  const [likesCount, setLikesCount] = useState(rec.likes_count);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(rec.saved_by_me);
  const CategoryIcon = CATEGORY_ICONS[rec.category];
  const colors = CATEGORY_COLORS[rec.category];

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    const result = await toggleLike(rec.id);
    if (result.success) {
      setLiked(result.liked ?? !liked);
      setLikesCount((c) => (result.liked ? c + 1 : c - 1));
    }
    setLiking(false);
  };

  const handleSave = async () => {
    if (saving || saved) return;
    setSaving(true);
    const result = await saveRecommendation({
      title: rec.title,
      description: rec.description,
      category: rec.category,
      image_url: rec.image_url,
      external_url: rec.external_url,
      source: rec.source,
      source_id: rec.source_id,
      recommendation_id: rec.id,
    });
    if (result.success) setSaved(true);
    setSaving(false);
  };

  return (
    <div className={`flex items-start gap-3 py-3 px-4 border-b border-l-4 ${colors.border}`}>
      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
        <AvatarImage src={rec.user.avatar_url} />
        <AvatarFallback className="text-[10px]">
          {rec.user.display_name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium text-foreground">{rec.user.display_name}</span>
          <span>·</span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${colors.pill}`}>
            <CategoryIcon className="h-2.5 w-2.5" />
            {rec.category}
          </span>
          <span>·</span>
          <span>{timeAgo(rec.created_at)}</span>
        </div>

        <p className="font-medium text-sm leading-tight line-clamp-1">{rec.title}</p>

        <div className="flex items-center gap-1 pt-0.5">
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 text-xs px-1.5 ${liked ? "text-red-500" : ""}`}
            onClick={handleLike}
            disabled={liking}
          >
            {liking ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Heart className={`h-3 w-3 mr-1 ${liked ? "fill-current" : ""}`} />
            )}
            {likesCount}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5"
            onClick={handleSave}
            disabled={saving || saved}
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : saved ? (
              <BookmarkCheck className="h-3 w-3 text-primary" />
            ) : (
              <Bookmark className="h-3 w-3" />
            )}
          </Button>

          {rec.external_url && (
            <Button variant="ghost" size="sm" className="h-6 px-1.5" asChild>
              <a href={rec.external_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Saved Recommendation Card ───────────────────────────

export function SavedRecommendationCard({
  rec,
  onRemoved,
  onConsumedToggle,
}: {
  rec: SavedRecommendation;
  onRemoved?: () => void;
  onConsumedToggle?: (id: string, consumed: boolean) => void;
}) {
  const [removing, setRemoving] = useState(false);
  const [consuming, setConsuming] = useState(false);
  const [consumed, setConsumed] = useState(!!rec.consumed_at);
  const CategoryIcon = CATEGORY_ICONS[rec.category];
  const colors = CATEGORY_COLORS[rec.category];

  const handleRemove = async () => {
    if (removing) return;
    setRemoving(true);
    const result = await removeSavedRecommendation(rec.id);
    if (result.success) {
      onRemoved?.();
    }
    setRemoving(false);
  };

  const handleConsume = async () => {
    if (consuming) return;
    setConsuming(true);
    const result = await toggleConsumed(rec.id);
    if (result.success) {
      setConsumed(result.consumed ?? !consumed);
      onConsumedToggle?.(rec.id, result.consumed ?? !consumed);
    }
    setConsuming(false);
  };

  return (
    <div className={`flex items-start gap-3 py-3 px-4 border-l-4 ${colors.border} ${consumed ? "opacity-60" : ""}`}>
      {rec.image_url && (
        <div className="w-10 h-14 shrink-0 overflow-hidden rounded bg-muted">
          <img
            src={rec.image_url}
            alt={rec.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-1">
        <p className={`font-medium text-sm leading-tight line-clamp-1 ${consumed ? "line-through text-muted-foreground" : ""}`}>
          {rec.title}
        </p>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CategoryIcon className="h-3 w-3" />
          <span>{rec.category}</span>
          <span className="text-muted-foreground/50">·</span>
          <span>{SOURCE_LABELS[rec.source]}</span>
        </div>

        <div className="flex items-center gap-1 pt-0.5">
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 px-1.5 ${consumed ? "text-green-600" : "text-muted-foreground"}`}
            onClick={handleConsume}
            disabled={consuming}
            title={consumed ? "Mark as unwatched" : "Mark as watched/read/played"}
          >
            {consuming ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className={`h-3.5 w-3.5 ${consumed ? "fill-green-600 text-white" : ""}`} />
            )}
          </Button>

          {rec.external_url && (
            <Button variant="ghost" size="sm" className="h-6 px-1.5" asChild>
              <a href={rec.external_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-destructive hover:text-destructive ml-auto"
            onClick={handleRemove}
            disabled={removing}
          >
            {removing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
