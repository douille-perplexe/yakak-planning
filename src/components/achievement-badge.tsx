import { FeaturedBadge } from "@/lib/types";
import { getAchievementIcon, getTierColorClass } from "@/lib/achievement-utils";

interface AchievementBadgeProps {
  badge: FeaturedBadge | null;
  size?: "sm" | "md";
}

export function AchievementBadge({ badge, size = "sm" }: AchievementBadgeProps) {
  if (!badge) return null;

  const Icon = getAchievementIcon(badge.icon);
  const colorClass = getTierColorClass(badge.tier);
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const wrapperSize = size === "sm" ? "h-5 w-5" : "h-6 w-6";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border ${colorClass} ${wrapperSize} flex-shrink-0`}
      title={`${badge.name} (${badge.tier})`}
    >
      <Icon className={iconSize} />
    </span>
  );
}
