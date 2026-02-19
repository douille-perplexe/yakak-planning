"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pin, PinOff, Loader2 } from "lucide-react";
import { togglePinEvent } from "@/app/actions/events";

export function PinToggleButton({
  eventId,
  isPinned,
}: {
  eventId: string;
  isPinned: boolean;
}) {
  const [pinned, setPinned] = useState(isPinned);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    const result = await togglePinEvent(eventId);
    if (result.success) {
      setPinned(result.pinned ?? !pinned);
    }
    setLoading(false);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      title={pinned ? "Unpin event" : "Pin event"}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {pinned ? "Unpin" : "Pin"}
        </>
      ) : pinned ? (
        <>
          <PinOff className="mr-2 h-4 w-4" />
          Unpin
        </>
      ) : (
        <>
          <Pin className="mr-2 h-4 w-4" />
          Pin
        </>
      )}
    </Button>
  );
}
