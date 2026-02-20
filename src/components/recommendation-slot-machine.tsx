"use client";

import { useState } from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRandomRecommendations } from "@/app/actions/recommendations";
import { ApiRecommendationCard, CATEGORY_ICONS, CATEGORY_COLORS } from "@/components/recommendation-card";
import type { ApiRecommendation, RecommendationCategory } from "@/lib/types";

const API_CATEGORIES: (RecommendationCategory | "All")[] = [
  "All",
  "Movies",
  "TV Series",
  "Anime",
  "Games",
  "Music",
  "Books",
];

const COUNTS = [1, 3, 5] as const;

function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden animate-pulse">
      <div className="h-1 w-full bg-muted" />
      <div className="aspect-[2/3] bg-muted" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
    </div>
  );
}

export function RecommendationSlotMachine() {
  const [category, setCategory] = useState<RecommendationCategory | "All">("All");
  const [count, setCount] = useState<number>(3);
  const [results, setResults] = useState<ApiRecommendation[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSpin = async () => {
    setSpinning(true);
    setShowResults(false);
    setError(null);

    const { recommendations, error: err } = await getRandomRecommendations(
      category,
      count
    );

    await new Promise((r) => setTimeout(r, 800));

    if (err) {
      setError(err);
      setResults([]);
    } else {
      setResults(recommendations);
    }
    setSpinning(false);
    setShowResults(true);
  };

  return (
    <div className="space-y-6">
      {/* Category pills */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {API_CATEGORIES.map((c) => {
            const isSelected = category === c;
            const colors = c !== "All" ? CATEGORY_COLORS[c as RecommendationCategory] : null;
            const Icon = c !== "All" ? CATEGORY_ICONS[c as RecommendationCategory] : null;

            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  isSelected
                    ? colors
                      ? `${colors.pill} border`
                      : "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-transparent hover:border-border"
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {c}
              </button>
            );
          })}
        </div>

        {/* Count segmented buttons */}
        <div className="flex items-center gap-1">
          {COUNTS.map((c) => (
            <button
              key={c}
              onClick={() => setCount(c)}
              className={`px-3 py-1 text-sm rounded border transition-colors ${
                count === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-transparent hover:border-border"
              }`}
            >
              {c}
            </button>
          ))}
          <Button onClick={handleSpin} disabled={spinning} className="ml-3">
            <Dices className="h-4 w-4 mr-2" />
            {spinning ? "Spinning..." : "Spin!"}
          </Button>
        </div>
      </div>

      {/* Skeleton loading */}
      {spinning && (
        <div
          className={`grid gap-4 ${
            count === 1
              ? "grid-cols-1 max-w-sm"
              : count <= 3
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          }`}
        >
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !spinning && (
        <p className="text-sm text-destructive text-center py-4">{error}</p>
      )}

      {/* Results */}
      {showResults && !spinning && results.length > 0 && (
        <>
          <div
            className={`grid gap-4 ${
              results.length === 1
                ? "grid-cols-1 max-w-sm"
                : results.length <= 3
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
            }`}
          >
            {results.map((rec, i) => (
              <ApiRecommendationCard key={`${rec.source_id}-${i}`} rec={rec} />
            ))}
          </div>

          <div className="flex justify-center pt-2">
            <Button variant="outline" onClick={handleSpin} disabled={spinning}>
              <Dices className="h-4 w-4 mr-2" />
              Spin again
            </Button>
          </div>
        </>
      )}

      {showResults && !spinning && results.length === 0 && !error && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No results found. Try a different category!
        </p>
      )}
    </div>
  );
}
