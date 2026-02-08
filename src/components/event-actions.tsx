"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2 } from "lucide-react";
import { updateEvent, deleteEvent } from "@/app/actions/events";
import { Event } from "@/lib/types";

export function EventActions({
  eventId,
  event,
  isCreator,
  isAdmin,
}: {
  eventId: string;
  event: Event;
  isCreator: boolean;
  isAdmin: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = async (formData: FormData) => {
    setLoading(true);
    setError(null);

    const result = await updateEvent(eventId, {
      title: formData.get("title") as string,
      date: formData.get("date") as string,
      location: formData.get("location") as string,
      description: (formData.get("description") as string) || undefined,
      reminder_hours: Number(formData.get("reminder_hours")) || 24,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to update event");
    } else {
      setEditOpen(false);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to cancel this event?")) return;
    await deleteEvent(eventId);
  };

  // Format date for datetime-local input
  const eventDate = new Date(event.date);
  const localDateStr = new Date(
    eventDate.getTime() - eventDate.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 16);

  return (
    <div className="flex gap-2">
      {isCreator && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            <form action={handleEdit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={event.title}
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <Label htmlFor="date">Date & Time</Label>
                <Input
                  id="date"
                  name="date"
                  type="datetime-local"
                  defaultValue={localDateStr}
                  required
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  defaultValue={event.location}
                  maxLength={200}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={event.description ?? ""}
                  maxLength={2000}
                />
              </div>
              <div>
                <Label htmlFor="reminder_hours">Reminder (hours before)</Label>
                <Input
                  id="reminder_hours"
                  name="reminder_hours"
                  type="number"
                  defaultValue={event.reminder_hours}
                  min={1}
                  max={720}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {(isCreator || isAdmin) && (
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      )}
    </div>
  );
}
