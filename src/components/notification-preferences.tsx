"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { NotificationPreference, NotificationType } from "@/lib/types";
import { updateNotifPrefs } from "@/app/actions/notification-preferences";

const TYPE_LABELS: Record<NotificationType, string> = {
  event_created: "New events",
  event_updated: "Event updates",
  event_cancelled: "Event cancellations",
  new_comment: "New comments",
  new_rsvp: "New RSVPs",
  poll_created: "New polls",
  poll_closed: "Poll results",
  event_reminder: "Event reminders",
  availability_signal: "Availability signals",
  achievement_unlocked: "Achievements",
};

const ORDERED_TYPES: NotificationType[] = [
  "event_created",
  "event_updated",
  "event_cancelled",
  "new_comment",
  "new_rsvp",
  "poll_created",
  "poll_closed",
  "event_reminder",
  "availability_signal",
  "achievement_unlocked",
];

interface NotificationPreferencesProps {
  preferences: NotificationPreference[];
}

export function NotificationPreferences({
  preferences: initialPreferences,
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState(initialPreferences);

  const getPref = (type: NotificationType) =>
    preferences.find((p) => p.type === type);

  const handleToggle = async (
    type: NotificationType,
    field: "email_enabled" | "in_app_enabled",
    currentValue: boolean
  ) => {
    const newValue = !currentValue;

    // Optimistic update
    setPreferences((prev) =>
      prev.map((p) =>
        p.type === type ? { ...p, [field]: newValue } : p
      )
    );

    const result = await updateNotifPrefs(type, field, newValue);
    if (!result.success) {
      // Revert on failure
      setPreferences((prev) =>
        prev.map((p) =>
          p.type === type ? { ...p, [field]: currentValue } : p
        )
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-center pb-2 border-b">
            <span className="text-sm font-medium text-muted-foreground">
              Type
            </span>
            <span className="text-sm font-medium text-muted-foreground w-16 text-center">
              In-App
            </span>
            <span className="text-sm font-medium text-muted-foreground w-16 text-center">
              Email
            </span>
          </div>

          {/* Preference rows */}
          {ORDERED_TYPES.map((type) => {
            const pref = getPref(type);
            return (
              <div
                key={type}
                className="grid grid-cols-[1fr_auto_auto] gap-4 items-center py-2.5"
              >
                <span className="text-sm">{TYPE_LABELS[type]}</span>
                <div className="w-16 flex justify-center">
                  <Switch
                    checked={pref?.in_app_enabled ?? true}
                    onCheckedChange={() =>
                      handleToggle(
                        type,
                        "in_app_enabled",
                        pref?.in_app_enabled ?? true
                      )
                    }
                  />
                </div>
                <div className="w-16 flex justify-center">
                  <Switch
                    checked={pref?.email_enabled ?? true}
                    onCheckedChange={() =>
                      handleToggle(
                        type,
                        "email_enabled",
                        pref?.email_enabled ?? true
                      )
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
