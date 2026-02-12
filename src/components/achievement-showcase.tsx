"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { AchievementDefinition, UserAchievementWithDefinition } from "@/lib/types";
import { getAchievementIcon, getTierColorClass } from "@/lib/achievement-utils";
import { setFeaturedBadge } from "@/app/actions/achievements";

interface AchievementShowcaseProps {
  allDefinitions: AchievementDefinition[];
  userAchievements: UserAchievementWithDefinition[];
  currentFeaturedId: string | null;
}

export function AchievementShowcase({
  allDefinitions,
  userAchievements,
  currentFeaturedId,
}: AchievementShowcaseProps) {
  const [featuredId, setFeaturedId] = useState(currentFeaturedId);
  const [loading, setLoading] = useState(false);

  const unlockedIds = new Set(userAchievements.map((ua) => ua.achievement_id));

  // Group definitions by achievement_group
  const groups = new Map<string, AchievementDefinition[]>();
  for (const def of allDefinitions) {
    const group = groups.get(def.achievement_group) ?? [];
    group.push(def);
    groups.set(def.achievement_group, group);
  }

  // Sort tiers within each group
  for (const [, defs] of groups) {
    defs.sort((a, b) => a.tier_position - b.tier_position);
  }

  const handleSetFeatured = async (achievementId: string | null) => {
    if (loading) return;
    setLoading(true);

    const newId = achievementId === featuredId ? null : achievementId;
    setFeaturedId(newId);

    const result = await setFeaturedBadge(newId);
    if (!result.success) {
      setFeaturedId(featuredId); // revert
    }
    setLoading(false);
  };

  const unlockedCount = unlockedIds.size;
  const totalCount = allDefinitions.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Achievements</span>
          <span className="text-sm font-normal text-muted-foreground">
            {unlockedCount}/{totalCount} unlocked
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([groupName, defs]) => (
            <div key={groupName}>
              <p className="text-sm font-medium text-muted-foreground mb-2 capitalize">
                {groupName.replace(/_/g, " ")}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {defs.map((def) => {
                  const isUnlocked = unlockedIds.has(def.id);
                  const isFeatured = featuredId === def.id;
                  const Icon = getAchievementIcon(def.icon);
                  const colorClass = getTierColorClass(def.tier);

                  return (
                    <div
                      key={def.id}
                      className={`relative flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                        isUnlocked
                          ? `${colorClass} border`
                          : "bg-muted/50 border-transparent opacity-40"
                      } ${isFeatured ? "ring-2 ring-primary" : ""}`}
                      title={`${def.name} — ${def.description}`}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-[10px] font-medium text-center leading-tight">
                        {def.name}
                      </span>
                      <span className="text-[9px] capitalize opacity-70">
                        {def.tier}
                      </span>
                      {isUnlocked && (
                        <button
                          onClick={() => handleSetFeatured(def.id)}
                          className={`absolute top-1 right-1 p-0.5 rounded-full transition-colors ${
                            isFeatured
                              ? "text-primary"
                              : "text-muted-foreground/40 hover:text-muted-foreground"
                          }`}
                          title={isFeatured ? "Remove featured badge" : "Set as featured badge"}
                          disabled={loading}
                        >
                          <Star
                            className="h-3 w-3"
                            fill={isFeatured ? "currentColor" : "none"}
                          />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
