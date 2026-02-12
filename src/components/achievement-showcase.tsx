"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Lock } from "lucide-react";
import { AchievementDefinition, UserAchievementWithDefinition } from "@/lib/types";
import { getAchievementIcon, getTierColorClass, getTierEmoji } from "@/lib/achievement-utils";
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
  const [selectedDef, setSelectedDef] = useState<AchievementDefinition | null>(null);

  const unlockedIds = new Set(userAchievements.map((ua) => ua.achievement_id));
  const unlockedMap = new Map(userAchievements.map((ua) => [ua.achievement_id, ua]));

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
                    <button
                      key={def.id}
                      onClick={() => setSelectedDef(def)}
                      className={`relative flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors cursor-pointer hover:ring-1 hover:ring-ring ${
                        isUnlocked
                          ? `${colorClass} border`
                          : "bg-muted/50 border-transparent opacity-40"
                      } ${isFeatured ? "ring-2 ring-primary" : ""}`}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-[10px] font-medium text-center leading-tight">
                        {def.name}
                      </span>
                      <span className="text-[9px] capitalize opacity-70">
                        {def.tier}
                      </span>
                      {isUnlocked && isFeatured && (
                        <span className="absolute top-1 right-1 text-primary">
                          <Star className="h-3 w-3" fill="currentColor" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Achievement detail modal */}
      <Dialog open={!!selectedDef} onOpenChange={(open) => !open && setSelectedDef(null)}>
        {selectedDef && (() => {
          const isUnlocked = unlockedIds.has(selectedDef.id);
          const isFeatured = featuredId === selectedDef.id;
          const unlock = unlockedMap.get(selectedDef.id);
          const SelectedIcon = getAchievementIcon(selectedDef.icon);
          const selectedColorClass = getTierColorClass(selectedDef.tier);
          const emoji = getTierEmoji(selectedDef.tier);

          return (
            <DialogContent>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center justify-center h-12 w-12 rounded-full border-2 ${
                    isUnlocked ? selectedColorClass : "bg-muted text-muted-foreground border-muted"
                  }`}>
                    <SelectedIcon className="h-6 w-6" />
                  </span>
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      {selectedDef.name}
                      <span className="text-base">{emoji}</span>
                    </DialogTitle>
                    <p className="text-xs capitalize text-muted-foreground mt-0.5">
                      {selectedDef.tier} &middot; {selectedDef.achievement_group.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              </DialogHeader>
              <DialogDescription className="text-sm">
                {selectedDef.description}
              </DialogDescription>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Threshold: {selectedDef.threshold}</p>
                {isUnlocked && unlock ? (
                  <p>
                    Unlocked on{" "}
                    {new Date(unlock.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {unlock.granted_by ? " (manually granted)" : ""}
                  </p>
                ) : (
                  <p className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Not yet unlocked
                  </p>
                )}
              </div>
              {isUnlocked && (
                <DialogFooter>
                  <Button
                    variant={isFeatured ? "outline" : "default"}
                    size="sm"
                    disabled={loading}
                    onClick={async () => {
                      await handleSetFeatured(selectedDef.id);
                      setSelectedDef(null);
                    }}
                  >
                    <Star className="h-4 w-4 mr-1" fill={isFeatured ? "currentColor" : "none"} />
                    {isFeatured ? "Remove Featured" : "Set as Featured"}
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          );
        })()}
      </Dialog>
    </Card>
  );
}
