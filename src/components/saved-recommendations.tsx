"use client";

import { useState } from "react";
import { Bookmark, ChevronDown, ChevronUp } from "lucide-react";
import { SavedRecommendationCard, CATEGORY_ICONS, CATEGORY_COLORS } from "@/components/recommendation-card";
import type { RecommendationCategory, SavedRecommendation } from "@/lib/types";

interface SavedRecommendationsProps {
  initialSaved: SavedRecommendation[];
}

function groupByCategory(items: SavedRecommendation[]): Map<RecommendationCategory, SavedRecommendation[]> {
  const map = new Map<RecommendationCategory, SavedRecommendation[]>();
  for (const item of items) {
    const existing = map.get(item.category);
    if (existing) {
      existing.push(item);
    } else {
      map.set(item.category, [item]);
    }
  }
  return map;
}

function CategorySection({
  category,
  items,
  onRemoved,
  onConsumedToggle,
}: {
  category: RecommendationCategory;
  items: SavedRecommendation[];
  onRemoved: (id: string) => void;
  onConsumedToggle: (id: string, consumed: boolean) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const CategoryIcon = CATEGORY_ICONS[category];
  const colors = CATEGORY_COLORS[category];

  const sorted = [...items].sort((a, b) => {
    const aConsumed = !!a.consumed_at;
    const bConsumed = !!b.consumed_at;
    if (aConsumed !== bConsumed) return aConsumed ? 1 : -1;
    return 0;
  });

  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-left"
      >
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${colors.pill}`}>
          <CategoryIcon className="h-3 w-3" />
          {category}
        </span>
        <span className="text-xs text-muted-foreground">({items.length})</span>
        <span className="ml-auto text-muted-foreground">
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </span>
      </button>

      {!collapsed && (
        <div className="divide-y">
          {sorted.map((rec) => (
            <SavedRecommendationCard
              key={rec.id}
              rec={rec}
              onRemoved={() => onRemoved(rec.id)}
              onConsumedToggle={onConsumedToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SavedRecommendations({
  initialSaved,
}: SavedRecommendationsProps) {
  const [saved, setSaved] = useState(initialSaved);

  const handleRemoved = (id: string) => {
    setSaved((prev) => prev.filter((s) => s.id !== id));
  };

  const handleConsumedToggle = (id: string, consumed: boolean) => {
    setSaved((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, consumed_at: consumed ? new Date().toISOString() : null }
          : s
      )
    );
  };

  if (saved.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Bookmark className="h-10 w-10 mx-auto text-muted-foreground/40" />
        <p className="font-medium">Nothing saved yet</p>
        <p className="text-sm text-muted-foreground">
          Save picks from Discover or the Community tab
        </p>
      </div>
    );
  }

  // Group by category, preserving insertion order (first item per category = most recently touched)
  const groups = groupByCategory(saved);

  return (
    <div className="space-y-3">
      {Array.from(groups.entries()).map(([category, items]) => (
        <CategorySection
          key={category}
          category={category}
          items={items}
          onRemoved={handleRemoved}
          onConsumedToggle={handleConsumedToggle}
        />
      ))}
    </div>
  );
}
