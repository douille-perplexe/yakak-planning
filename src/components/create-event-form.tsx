"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createEvent } from "@/app/actions/events";
import { CategoryPicker } from "@/components/category-picker";
import { ActivityCategory } from "@/lib/types";
import { STRAVA_SPORT_TYPES } from "@/lib/strava";
import { Activity } from "lucide-react";

interface CreateEventFormProps {
  categories: ActivityCategory[];
  hasStrava?: boolean;
}

export function CreateEventForm({ categories, hasStrava = false }: CreateEventFormProps) {
  const searchParams = useSearchParams();
  const prefilledDate = searchParams.get("date") ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [stravaEnabled, setStravaEnabled] = useState(false);
  const [stravaSportType, setStravaSportType] = useState("Run");

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);

    const costStr = formData.get("estimated_cost") as string;
    const estimatedCost = costStr ? parseFloat(costStr) : null;

    const result = await createEvent({
      title: formData.get("title") as string,
      date: formData.get("date") as string,
      location: formData.get("location") as string,
      description: (formData.get("description") as string) || undefined,
      duration_minutes: Number(formData.get("duration_minutes")) || 120,
      reminder_hours: Number(formData.get("reminder_hours")) || 24,
      estimated_cost: estimatedCost,
      category_ids: selectedCategoryIds,
      strava_sport_type: stravaEnabled ? stravaSportType : undefined,
    });

    if (!result?.success && result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
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
            <Label htmlFor="duration_minutes">Duration (minutes)</Label>
            <Input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              step={15}
              min={15}
              max={1440}
              defaultValue={120}
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

          {categories.length > 0 && (
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
            <Label htmlFor="estimated_cost">Estimated cost per person (EUR)</Label>
            <Input
              id="estimated_cost"
              name="estimated_cost"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
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

          {hasStrava && (
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 cursor-pointer" htmlFor="strava-toggle">
                  <Activity className="h-4 w-4 text-orange-500" />
                  Also create on Strava
                </Label>
                <input
                  id="strava-toggle"
                  type="checkbox"
                  checked={stravaEnabled}
                  onChange={(e) => setStravaEnabled(e.target.checked)}
                  className="h-4 w-4 accent-orange-500"
                />
              </div>
              {stravaEnabled && (
                <div>
                  <Label htmlFor="strava-sport-type">Sport type</Label>
                  <select
                    id="strava-sport-type"
                    value={stravaSportType}
                    onChange={(e) => setStravaSportType(e.target.value)}
                    className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {STRAVA_SPORT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create Event"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
