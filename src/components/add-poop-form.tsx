"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, LocateFixed, Star } from "lucide-react";
import { addPoop } from "@/app/actions/poopmap";

export function AddPoopForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [rating, setRating] = useState(0);

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toString());
        setLng(pos.coords.longitude.toString());
        setError(null);
      },
      () => setError("Unable to get your location")
    );
  };

  const handleSubmit = async (formData: FormData) => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
      setError("Location is required");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await addPoop({
      latitude,
      longitude,
      note: (formData.get("note") as string) || undefined,
      place: (formData.get("place") as string) || undefined,
      rating: rating > 0 ? rating : undefined,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to add poop");
    } else {
      setOpen(false);
      setLat("");
      setLng("");
      setRating(0);
    }
    setLoading(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Poop
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a Poop</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label>Location</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="Latitude"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Longitude"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleUseLocation}
              >
                <LocateFixed className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="poop-place">Place</Label>
            <Input id="poop-place" name="place" placeholder="e.g., Office" />
          </div>
          <div>
            <Label htmlFor="poop-note">Note</Label>
            <Textarea
              id="poop-note"
              name="note"
              placeholder="Any thoughts?"
              rows={2}
            />
          </div>
          <div>
            <Label>Rating</Label>
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: 5 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i + 1)}
                  className="p-0.5"
                >
                  <Star
                    className={`h-5 w-5 ${
                      i < rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <button
                  type="button"
                  onClick={() => setRating(0)}
                  className="text-xs text-muted-foreground ml-2"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Adding..." : "Add Poop"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
