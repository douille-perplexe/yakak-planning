"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Check } from "lucide-react";
import { votePoll, closePoll } from "@/app/actions/polls";
import { PollWithDetails } from "@/lib/types";

export function PollCard({
  poll,
  eventId,
  currentProfileId,
}: {
  poll: PollWithDetails;
  eventId: string;
  currentProfileId: string;
}) {
  const [userVote, setUserVote] = useState<string | null>(poll.user_vote);
  const [options, setOptions] = useState(poll.options);
  const [totalVotes, setTotalVotes] = useState(poll.total_votes);
  const [isClosed, setIsClosed] = useState(poll.is_closed);
  const [loading, setLoading] = useState(false);

  const isCreator = poll.user_id === currentProfileId;

  const handleVote = async (optionId: string) => {
    if (isClosed || loading) return;

    setLoading(true);

    // Optimistic update
    const prevVote = userVote;
    setUserVote(optionId);
    setOptions((prev) =>
      prev.map((o) => ({
        ...o,
        vote_count:
          o.id === optionId
            ? o.vote_count + 1
            : o.id === prevVote
              ? o.vote_count - 1
              : o.vote_count,
      }))
    );
    if (!prevVote) setTotalVotes((t) => t + 1);

    await votePoll(poll.id, optionId, eventId);
    setLoading(false);
  };

  const handleClose = async () => {
    setLoading(true);
    setIsClosed(true);
    await closePoll(poll.id, eventId);
    setLoading(false);
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{poll.question}</p>
          <p className="text-xs text-muted-foreground">
            by {poll.creator.display_name} &middot; {totalVotes} vote
            {totalVotes !== 1 ? "s" : ""}
          </p>
        </div>
        {isClosed && (
          <Badge variant="secondary">
            <Lock className="mr-1 h-3 w-3" />
            Closed
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {options
          .sort((a, b) => a.position - b.position)
          .map((option) => {
            const pct =
              totalVotes > 0
                ? Math.round((option.vote_count / totalVotes) * 100)
                : 0;
            const isVoted = userVote === option.id;

            return (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                disabled={isClosed || loading}
                className={`relative w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors overflow-hidden ${
                  isVoted
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                } ${isClosed ? "cursor-default" : "cursor-pointer"}`}
              >
                {/* Progress bar background */}
                <div
                  className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {isVoted && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                    {option.label}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {pct}%
                  </span>
                </div>
              </button>
            );
          })}
      </div>

      {isCreator && !isClosed && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClose}
          disabled={loading}
        >
          <Lock className="mr-2 h-3.5 w-3.5" />
          Close Poll
        </Button>
      )}
    </div>
  );
}
