"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRecommendationCard } from "@/components/recommendation-card";
import { getUserRecommendations } from "@/app/actions/recommendations";
import { SubmitRecommendationForm } from "@/components/submit-recommendation-form";
import type { RecommendationCategory, RecommendationWithUser } from "@/lib/types";

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

interface UserRecommendationsFeedProps {
  initialRecommendations: RecommendationWithUser[];
}

export function UserRecommendationsFeed({
  initialRecommendations,
}: UserRecommendationsFeedProps) {
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [category, setCategory] = useState<RecommendationCategory | "All">("All");
  const [sortBy, setSortBy] = useState<"recent" | "likes">("recent");
  const [isPending, startTransition] = useTransition();

  const handleFilterChange = (
    newCategory: RecommendationCategory | "All",
    newSort: "recent" | "likes"
  ) => {
    setCategory(newCategory);
    setSortBy(newSort);
    startTransition(async () => {
      const data = await getUserRecommendations(
        newSort,
        newCategory === "All" ? undefined : newCategory
      );
      setRecommendations(data);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={category}
          onValueChange={(v) =>
            handleFilterChange(v as RecommendationCategory | "All", sortBy)
          }
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

        <Select
          value={sortBy}
          onValueChange={(v) =>
            handleFilterChange(category, v as "recent" | "likes")
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recent</SelectItem>
            <SelectItem value="likes">Most Liked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isPending && (
        <p className="text-sm text-muted-foreground">Loading...</p>
      )}

      {!isPending && recommendations.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="font-medium text-foreground">No recommendations yet</p>
          <p className="text-sm text-muted-foreground">Be the first to share something great</p>
          <div className="flex justify-center pt-2">
            <SubmitRecommendationForm />
          </div>
        </div>
      )}

      {!isPending && recommendations.length > 0 && (
        <div className="divide-y divide-border">
          {recommendations.map((rec) => (
            <UserRecommendationCard key={rec.id} rec={rec} />
          ))}
        </div>
      )}
    </div>
  );
}
