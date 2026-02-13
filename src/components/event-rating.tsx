"use client";

import { useState } from "react";
import { Star, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { upsertRating, deleteRating } from "@/app/actions/ratings";
import { EventRatingWithUser } from "@/lib/types";

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}) {
  const [hoverValue, setHoverValue] = useState(0);
  const displayValue = hoverValue || value;
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={
            readonly
              ? "cursor-default"
              : "cursor-pointer hover:scale-110 transition-transform"
          }
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => !readonly && setHoverValue(0)}
        >
          <Star
            className={`${sizeClass} ${
              star <= displayValue
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function EventRatingSection({
  eventId,
  ratings,
  currentProfileId,
  canRate,
}: {
  eventId: string;
  ratings: EventRatingWithUser[];
  currentProfileId: string;
  canRate: boolean;
}) {
  const existingRating = ratings.find((r) => r.user_id === currentProfileId);

  const [isEditing, setIsEditing] = useState(false);
  const [selectedRating, setSelectedRating] = useState(existingRating?.rating ?? 0);
  const [reviewText, setReviewText] = useState(existingRating?.review ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showForm = canRate && (!existingRating || isEditing);

  const avgRating =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

  const handleSubmit = async () => {
    if (selectedRating === 0) {
      setError("Please select a rating");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await upsertRating(
      eventId,
      selectedRating,
      reviewText || null
    );
    if (!result.success) {
      setError(result.error ?? "Something went wrong");
    } else {
      setIsEditing(false);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    const result = await deleteRating(eventId);
    if (!result.success) {
      setError(result.error ?? "Something went wrong");
    } else {
      setSelectedRating(0);
      setReviewText("");
      setIsEditing(false);
    }
    setLoading(false);
  };

  const handleEdit = () => {
    setSelectedRating(existingRating?.rating ?? 0);
    setReviewText(existingRating?.review ?? "");
    setIsEditing(true);
  };

  return (
    <div className="space-y-4">
      {/* Summary header */}
      {ratings.length > 0 && (
        <div className="flex items-center gap-2">
          <StarRating value={Math.round(avgRating)} readonly size="sm" />
          <span className="text-sm font-medium">
            {avgRating.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">
            ({ratings.length} {ratings.length === 1 ? "rating" : "ratings"})
          </span>
        </div>
      )}

      {/* Rating form */}
      {showForm && (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">
            {existingRating ? "Update your rating" : "Rate this event"}
          </p>
          <StarRating value={selectedRating} onChange={setSelectedRating} />
          <Textarea
            placeholder="Write an optional review (max 500 characters)"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value.slice(0, 500))}
            rows={3}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {reviewText.length}/500
            </span>
            <div className="flex gap-2">
              {isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
              )}
              <Button size="sm" onClick={handleSubmit} disabled={loading}>
                {loading
                  ? "Saving..."
                  : existingRating
                    ? "Update"
                    : "Submit"}
              </Button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      )}

      {/* Existing rating display with edit/delete buttons */}
      {canRate && existingRating && !isEditing && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Your rating:</span>
          <StarRating value={existingRating.rating} readonly size="sm" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleEdit}
            disabled={loading}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Ratings list */}
      {ratings.length > 0 ? (
        <div className="space-y-3">
          {ratings.map((r) => (
            <div key={r.id} className="flex gap-3">
              <Avatar className="h-7 w-7 mt-0.5">
                <AvatarImage src={r.user.avatar_url} />
                <AvatarFallback className="text-xs">
                  {r.user.display_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {r.user.display_name}
                  </span>
                  <StarRating value={r.rating} readonly size="sm" />
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(r.created_at)}
                  </span>
                </div>
                {r.review && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {r.review}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No ratings yet.
        </p>
      )}
    </div>
  );
}
