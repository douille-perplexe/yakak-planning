"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createEvent } from "@/app/actions/events";

export default function NewEventPage() {
  const searchParams = useSearchParams();
  const prefilledDate = searchParams.get("date") ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);

    const result = await createEvent({
      title: formData.get("title") as string,
      date: formData.get("date") as string,
      location: formData.get("location") as string,
      description: (formData.get("description") as string) || undefined,
      reminder_hours: Number(formData.get("reminder_hours")) || 24,
    });

    if (!result?.success && result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success, the server action redirects to the event page
  };

  return (
    <div className="space-y-6">
      <Link href="/">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>

      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Event</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Dinner at Mario's"
                maxLength={100}
                required
              />
            </div>

            <div>
              <Label htmlFor="date">
                Date & Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                name="date"
                type="datetime-local"
                defaultValue={
                  prefilledDate ? `${prefilledDate}T19:00` : undefined
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="location">
                Location <span className="text-destructive">*</span>
              </Label>
              <Input
                id="location"
                name="location"
                placeholder="e.g., Paris, 15th arrondissement"
                maxLength={200}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Add any extra details..."
                maxLength={2000}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="reminder_hours">Reminder (hours before)</Label>
              <Input
                id="reminder_hours"
                name="reminder_hours"
                type="number"
                defaultValue={24}
                min={1}
                max={720}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Event"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
