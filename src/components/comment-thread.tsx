"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Trash2 } from "lucide-react";
import { createComment, deleteComment } from "@/app/actions/comments";
import { CommentWithUser, Profile } from "@/lib/types";

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
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!content.trim() || loading) return;

    setLoading(true);
    const result = await createComment(eventId, content);

    if (result.success) {
      setContent("");
      // Optimistic: the revalidation from the server action will refresh the data.
      // For instant feedback, we'll let the server re-render handle it.
    }
    setLoading(false);
  };

  const handleDelete = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    await deleteComment(commentId, eventId);
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
            >;
            const isOwn = comment.user_id === currentProfileId;

            return (
              <div key={comment.id} className="flex gap-3 group">
                <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
                  <AvatarImage src={author.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {author.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {author.display_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(comment.created_at)}
                    </span>
                    {isOwn && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                        title="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })}
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
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!content.trim() || loading}
          className="flex-shrink-0 self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {content.length > 1800 && (
        <p className="text-xs text-muted-foreground text-right">
          {content.length}/2000
        </p>
      )}
    </div>
  );
}
