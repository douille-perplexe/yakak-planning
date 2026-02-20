"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SavedRecommendationCard } from "@/components/recommendation-card";
import type { RecommendationCategory, SavedRecommendation } from "@/lib/types";

const FILTER_CATEGORIES: (RecommendationCategory | "All")[] = [
  "All",
  "Movies",
  "TV Series",
  "Anime",
  "Games",
  "Music",
  "Books",
  "Outings",
  "Restaurants",
  "Activities",
  "Podcasts",
  "Other",
];

interface SavedRecommendationsProps {
  initialSaved: SavedRecommendation[];
}

export function SavedRecommendations({
  initialSaved,
}: SavedRecommendationsProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [category, setCategory] = useState<RecommendationCategory | "All">("All");

  const filtered =
    category === "All" ? saved : saved.filter((s) => s.category === category);

  const handleRemoved = (id: string) => {
    setSaved((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as RecommendationCategory | "All")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {FILTER_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            You haven&apos;t saved anything yet.
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((rec) => (
            <SavedRecommendationCard
              key={rec.id}
              rec={rec}
              onRemoved={() => handleRemoved(rec.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
