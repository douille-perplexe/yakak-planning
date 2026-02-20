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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toggleLike, saveRecommendation, removeSavedRecommendation } from "@/app/actions/recommendations";
import type {
  RecommendationCategory,
  RecommendationSource,
  RecommendationWithUser,
  SavedRecommendation,
  ApiRecommendation,
} from "@/lib/types";

const CATEGORY_ICONS: Record<RecommendationCategory, React.ElementType> = {
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

const SOURCE_LABELS: Record<RecommendationSource, string> = {
  manual: "User",
  tmdb: "TMDB",
  rawg: "RAWG",
  spotify: "Spotify",
  google_books: "Google Books",
};

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
      {rec.image_url && (
        <div className="aspect-[2/3] max-h-48 overflow-hidden bg-muted">
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
    <Card className="overflow-hidden">
      {rec.image_url && (
        <div className="aspect-[2/3] max-h-48 overflow-hidden bg-muted">
          <img
            src={rec.image_url}
            alt={rec.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={rec.user.avatar_url} />
            <AvatarFallback className="text-[10px]">
              {rec.user.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">
            {rec.user.display_name}
          </span>
        </div>

        <h3 className="font-semibold text-sm leading-tight line-clamp-2">
          {rec.title}
        </h3>

        {rec.description && (
          <p className="text-xs text-muted-foreground line-clamp-3">
            {rec.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CategoryIcon className="h-3 w-3" />
          <span>{rec.category}</span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 text-xs ${liked ? "text-red-500" : ""}`}
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

          {rec.external_url && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <a href={rec.external_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </a>
            </Button>
          )}

          <Button
            variant={saved ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs ml-auto"
            onClick={handleSave}
            disabled={saving || saved}
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : saved ? (
              <BookmarkCheck className="h-3 w-3" />
            ) : (
              <Bookmark className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Saved Recommendation Card ───────────────────────────

export function SavedRecommendationCard({
  rec,
  onRemoved,
}: {
  rec: SavedRecommendation;
  onRemoved?: () => void;
}) {
  const [removing, setRemoving] = useState(false);
  const CategoryIcon = CATEGORY_ICONS[rec.category];

  const handleRemove = async () => {
    if (removing) return;
    setRemoving(true);
    const result = await removeSavedRecommendation(rec.id);
    if (result.success) {
      onRemoved?.();
    }
    setRemoving(false);
  };

  return (
    <Card className="overflow-hidden">
      {rec.image_url && (
        <div className="aspect-[2/3] max-h-48 overflow-hidden bg-muted">
          <img
            src={rec.image_url}
            alt={rec.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2">
          {rec.title}
        </h3>

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
            variant="ghost"
            size="sm"
            className="h-7 text-xs ml-auto text-destructive hover:text-destructive"
            onClick={handleRemove}
            disabled={removing}
          >
            {removing ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Trash2 className="h-3 w-3 mr-1" />
            )}
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
