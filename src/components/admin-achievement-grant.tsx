"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award } from "lucide-react";
import { AchievementDefinition, Profile } from "@/lib/types";
import { adminGrantAchievement } from "@/app/actions/achievements";

interface AdminAchievementGrantProps {
  members: Pick<Profile, "id" | "display_name">[];
  definitions: AchievementDefinition[];
}

export function AdminAchievementGrant({
  members,
  definitions,
}: AdminAchievementGrantProps) {
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedAchievement, setSelectedAchievement] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleGrant = async () => {
    if (!selectedMember || !selectedAchievement || loading) return;
    setLoading(true);
    setMessage(null);

    const result = await adminGrantAchievement(selectedMember, selectedAchievement);

    if (result.success) {
      setMessage("Achievement granted!");
      setSelectedMember("");
      setSelectedAchievement("");
    } else {
      setMessage(result.error ?? "Failed to grant");
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Grant Achievement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Member
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Achievement
            </label>
            <select
              value={selectedAchievement}
              onChange={(e) => setSelectedAchievement(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select achievement...</option>
              {definitions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.tier})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleGrant}
            disabled={!selectedMember || !selectedAchievement || loading}
            size="sm"
          >
            {loading ? "Granting..." : "Grant"}
          </Button>
          {message && (
            <span className={`text-sm ${message.includes("granted") ? "text-green-600" : "text-destructive"}`}>
              {message}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
