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
import { Pencil, Trash2, MoreVertical, X } from "lucide-react";
import { updateEvent, deleteEvent } from "@/app/actions/events";
import { Event, ActivityCategory } from "@/lib/types";
import { CategoryPicker } from "@/components/category-picker";

export function EventActions({
  eventId,
  event,
  isCreator,
  isAdmin,
  categories,
  eventCategoryIds,
}: {
  eventId: string;
  event: Event;
  isCreator: boolean;
  isAdmin: boolean;
  categories?: ActivityCategory[];
  eventCategoryIds?: string[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    eventCategoryIds ?? []
  );
  const [fabOpen, setFabOpen] = useState(false);

  const handleEdit = async (formData: FormData) => {
    setLoading(true);
    setError(null);

    const costStr = formData.get("estimated_cost") as string;
    const estimatedCost = costStr ? parseFloat(costStr) : null;

    const result = await updateEvent(eventId, {
      title: formData.get("title") as string,
      date: formData.get("date") as string,
      location: formData.get("location") as string,
      description: (formData.get("description") as string) || undefined,
      reminder_hours: Number(formData.get("reminder_hours")) || 24,
      estimated_cost: estimatedCost,
      category_ids: selectedCategoryIds,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to update event");
    } else {
      setEditOpen(false);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await deleteEvent(eventId);
    setDeleting(false);
    setDeleteOpen(false);
  };

  // Format date for datetime-local input
  const eventDate = new Date(event.date);
  const localDateStr = new Date(
    eventDate.getTime() - eventDate.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 16);

  const editDialog = (
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
        {categories && categories.length > 0 && (
          <div>
            <Label>Categories</Label>
            <div className="mt-1.5">
              <CategoryPicker
                categories={categories}
                selectedIds={selectedCategoryIds}
                onChange={setSelectedCategoryIds}
              />
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="estimated_cost">
            Estimated cost per person (EUR)
          </Label>
          <Input
            id="estimated_cost"
            name="estimated_cost"
            type="number"
            step="0.01"
            min="0"
            defaultValue={event.estimated_cost ?? ""}
            placeholder="0.00"
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
  );

  const deleteDialog = (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Cancel this event?</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">
        This will cancel <span className="font-medium text-foreground">{event.title}</span>. All RSVPed members will be notified. This action cannot be undone.
      </p>
      <div className="flex justify-end gap-2 mt-4">
        <Button
          variant="outline"
          onClick={() => setDeleteOpen(false)}
          disabled={deleting}
        >
          Keep event
        </Button>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Cancelling..." : "Yes, cancel event"}
        </Button>
      </div>
    </DialogContent>
  );

  return (
    <>
      {/* Desktop inline buttons */}
      <div className="hidden md:flex gap-2">
        {isCreator && (
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>
            {editDialog}
          </Dialog>
        )}

        {(isCreator || isAdmin) && (
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </DialogTrigger>
            {deleteDialog}
          </Dialog>
        )}
      </div>

      {/* Mobile FAB speed-dial */}
      <div className="md:hidden">
        {/* Backdrop */}
        {fabOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setFabOpen(false)}
          />
        )}

        <div className="fixed bottom-24 right-4 z-40 flex flex-col-reverse items-center gap-3">
          {/* Main FAB toggle */}
          <button
            onClick={() => setFabOpen(!fabOpen)}
            className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          >
            {fabOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <MoreVertical className="h-6 w-6" />
            )}
          </button>

          {/* Speed-dial items */}
          {fabOpen && (
            <>
              {(isCreator || isAdmin) && (
                <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (open) setFabOpen(false); }}>
                  <DialogTrigger asChild>
                    <button className="h-11 w-11 rounded-full bg-destructive text-destructive-foreground shadow-md flex items-center justify-center active:scale-95 transition-transform animate-in fade-in slide-in-from-bottom-2 duration-150">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </DialogTrigger>
                  {deleteDialog}
                </Dialog>
              )}

              {isCreator && (
                <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (open) setFabOpen(false); }}>
                  <DialogTrigger asChild>
                    <button className="h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center active:scale-95 transition-transform animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <Pencil className="h-5 w-5" />
                    </button>
                  </DialogTrigger>
                  {editDialog}
                </Dialog>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
