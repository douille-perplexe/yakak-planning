"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Trash2, SmilePlus, ImagePlus, X, Loader2 } from "lucide-react";
import { createComment, deleteComment } from "@/app/actions/comments";
import { toggleReaction } from "@/app/actions/reactions";
import { CommentWithUser, Profile, ReactionGroup, FeaturedBadge } from "@/lib/types";
import { AchievementBadge } from "@/components/achievement-badge";
import { GifPicker } from "@/components/gif-picker";
import { GifResult } from "@/lib/giphy";

const EMOJI_PICKER = [
  "\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F602}", "\u{1F389}",
  "\u{1F44F}", "\u{1F525}", "\u{1F914}", "\u{1F622}",
];

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

function ReactionBar({
  reactions,
  commentId,
  eventId,
}: {
  reactions: ReactionGroup[];
  commentId: string;
  eventId: string;
}) {
  const [localReactions, setLocalReactions] = useState(reactions);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (emoji: string) => {
    if (loading) return;
    setLoading(true);
    setPickerOpen(false);

    setLocalReactions((prev) => {
      const existing = prev.find((r) => r.emoji === emoji);
      if (existing) {
        if (existing.reacted_by_me) {
          if (existing.count === 1) return prev.filter((r) => r.emoji !== emoji);
          return prev.map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.count - 1, reacted_by_me: false }
              : r
          );
        } else {
          return prev.map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.count + 1, reacted_by_me: true }
              : r
          );
        }
      } else {
        return [...prev, { emoji, count: 1, reacted_by_me: true }];
      }
    });

    await toggleReaction(commentId, emoji, eventId);
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {localReactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => handleToggle(r.emoji)}
          disabled={loading}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
            r.reacted_by_me
              ? "bg-primary/15 border border-primary/30"
              : "bg-muted border border-transparent hover:border-border"
          } ${loading ? "pointer-events-none opacity-50" : ""}`}
        >
          <span>{r.emoji}</span>
          <span className="text-muted-foreground">{r.count}</span>
        </button>
      ))}

      <div className="relative">
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="inline-flex items-center justify-center h-6 w-6 rounded-full hover:bg-muted transition-colors"
          title="Add reaction"
        >
          <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        {pickerOpen && (
          <div className="absolute bottom-full left-0 mb-1 bg-card border border-border rounded-lg shadow-lg p-1.5 flex gap-1 z-10">
            {EMOJI_PICKER.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleToggle(emoji)}
                className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentThread({
  eventId,
  comments: initialComments,
  currentProfileId,
}: {
  eventId: string;
  comments: CommentWithUser[];
  currentProfileId: string;
}) {
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedGif, setSelectedGif] = useState<GifResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5 MB.");
      return;
    }

    setSelectedImage(file);
    setSelectedGif(null);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if ((!content.trim() && !selectedImage && !selectedGif) || loading) return;

    setLoading(true);

    let imageFormData: FormData | undefined;
    if (selectedImage) {
      imageFormData = new FormData();
      imageFormData.set("image", selectedImage);
    }

    const result = await createComment(
      eventId,
      content,
      imageFormData,
      selectedGif?.full_url,
    );

    if (result.success && result.comment) {
      setComments((prev) => [...prev, result.comment as unknown as CommentWithUser]);
      setContent("");
      clearImage();
      setSelectedGif(null);
    }
    setLoading(false);
  };

  const handleDelete = async (commentId: string) => {
    if (deletingId) return;
    setDeletingId(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    await deleteComment(commentId, eventId);
    setDeletingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No comments yet. Start the conversation!
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const author = comment.user as unknown as Pick<
              Profile,
              "id" | "display_name" | "avatar_url"
            > & { featured_badge: FeaturedBadge | null };
            const isOwn = comment.user_id === currentProfileId;

            return (
              <div key={comment.id} className="flex gap-3 group">
                <Link href={`/profile/${author.id}`} className="flex-shrink-0">
                  <Avatar className="h-8 w-8 mt-0.5">
                    <AvatarImage src={author.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {author.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/profile/${author.id}`} className="text-sm font-medium inline-flex items-center gap-1 hover:underline">
                      {author.display_name}
                      <AchievementBadge badge={author.featured_badge} />
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(comment.created_at)}
                    </span>
                    {isOwn && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        disabled={deletingId === comment.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                        title="Delete comment"
                      >
                        {deletingId === comment.id ? (
                          <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        )}
                      </button>
                    )}
                  </div>
                  {comment.content.trim() && (
                    <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  )}
                  {comment.image_url && (
                    <div className="mt-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={comment.image_url}
                        alt="Shared image"
                        className="rounded-lg max-w-full max-h-80 object-cover border border-border"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <ReactionBar
                    reactions={comment.reactions ?? []}
                    commentId={comment.id}
                    eventId={eventId}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image preview */}
      {imagePreview && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview}
            alt="Preview"
            className="rounded-lg max-h-32 border border-border"
          />
          <button
            onClick={clearImage}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* GIF preview */}
      {selectedGif && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedGif.preview_url}
            alt={selectedGif.title}
            className="rounded-lg max-h-32 border border-border"
          />
          <button
            onClick={() => setSelectedGif(null)}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* New comment form */}
      <div className="flex gap-3 pt-2 border-t border-border">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment..."
            maxLength={2000}
            rows={1}
            className="min-h-[40px] resize-none"
          />
        </div>
        <div className="flex flex-col gap-1 self-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageSelect}
            className="hidden"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            title="Attach image"
            className="flex-shrink-0"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <GifPicker
            onSelect={(gif) => {
              setSelectedGif(gif);
              setSelectedImage(null);
              setImagePreview(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={(!content.trim() && !selectedImage && !selectedGif) || loading}
            className="flex-shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {content.length > 1800 && (
        <p className="text-xs text-muted-foreground text-right">
          {content.length}/2000
        </p>
      )}
    </div>
  );
}
