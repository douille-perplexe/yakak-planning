"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, HelpCircle, X, Minus, Plus } from "lucide-react";
import { upsertRsvp } from "@/app/actions/rsvps";
import { RsvpStatus } from "@/lib/types";

const RSVP_OPTIONS: { status: RsvpStatus; label: string; icon: typeof Check }[] = [
  { status: "yes", label: "Yes", icon: Check },
  { status: "maybe", label: "Maybe", icon: HelpCircle },
  { status: "no", label: "No", icon: X },
];

export function RsvpButtons({
  eventId,
  currentStatus,
  currentGuestCount = 0,
}: {
  eventId: string;
  currentStatus: RsvpStatus | null;
  currentGuestCount?: number;
}) {
  const [status, setStatus] = useState<RsvpStatus | null>(currentStatus);
  const [guestCount, setGuestCount] = useState(currentGuestCount);
  const [loading, setLoading] = useState(false);

  const handleRsvp = async (newStatus: RsvpStatus) => {
    setLoading(true);
    setStatus(newStatus);
    const guests = newStatus === "no" ? 0 : guestCount;
    if (newStatus === "no") setGuestCount(0);
    await upsertRsvp(eventId, newStatus, guests);
    setLoading(false);
  };

  const handleGuestChange = async (delta: number) => {
    const newCount = Math.max(0, Math.min(10, guestCount + delta));
    if (newCount === guestCount) return;
    setGuestCount(newCount);
    if (status && status !== "no") {
      setLoading(true);
      await upsertRsvp(eventId, status, newCount);
      setLoading(false);
    }
  };

  const showGuestStepper = status === "yes" || status === "maybe";

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {RSVP_OPTIONS.map(({ status: optionStatus, label, icon: Icon }) => (
          <Button
            key={optionStatus}
            variant={status === optionStatus ? "default" : "outline"}
            onClick={() => handleRsvp(optionStatus)}
            disabled={loading}
            className="flex-1"
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>
      {showGuestStepper && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">Bringing guests:</span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleGuestChange(-1)}
              disabled={loading || guestCount <= 0}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-6 text-center font-medium">{guestCount}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleGuestChange(1)}
              disabled={loading || guestCount >= 10}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
