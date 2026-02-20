"use client";

import { useState } from "react";
import { Loader2, Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRandomRecommendations } from "@/app/actions/recommendations";
import { ApiRecommendationCard } from "@/components/recommendation-card";
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

    // Brief animation delay
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
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as RecommendationCategory | "All")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {API_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={count.toString()}
          onValueChange={(v) => setCount(Number(v))}
        >
          <SelectTrigger className="w-[80px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTS.map((c) => (
              <SelectItem key={c} value={c.toString()}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleSpin} disabled={spinning}>
          {spinning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Spinning...
            </>
          ) : (
            <>
              <Dices className="h-4 w-4 mr-2" />
              Spin!
            </>
          )}
        </Button>
      </div>

      {spinning && (
        <div className="flex justify-center py-12">
          <div className="animate-pulse space-y-2 text-center">
            <Dices className="h-12 w-12 mx-auto text-primary animate-bounce" />
            <p className="text-sm text-muted-foreground">
              Finding something great...
            </p>
          </div>
        </div>
      )}

      {error && !spinning && (
        <p className="text-sm text-destructive text-center py-4">{error}</p>
      )}

      {showResults && !spinning && results.length > 0 && (
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
      )}

      {showResults && !spinning && results.length === 0 && !error && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No results found. Try a different category!
        </p>
      )}
    </div>
  );
}
