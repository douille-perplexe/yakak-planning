"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, HelpCircle, X } from "lucide-react";
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
}: {
  eventId: string;
  currentStatus: RsvpStatus | null;
}) {
  const [status, setStatus] = useState<RsvpStatus | null>(currentStatus);
  const [loading, setLoading] = useState(false);

  const handleRsvp = async (newStatus: RsvpStatus) => {
    setLoading(true);
    setStatus(newStatus);
    await upsertRsvp(eventId, newStatus);
    setLoading(false);
  };

  return (
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
  );
}
