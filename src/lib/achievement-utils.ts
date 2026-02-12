import {
  CalendarCheck,
  Flame,
  Sun,
  MessageCircle,
  BarChart3,
  UserPlus,
  ClipboardList,
  Heart,
  Award,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { AchievementTier } from "@/lib/types";

const ICON_MAP: Record<string, LucideIcon> = {
  "calendar-check": CalendarCheck,
  flame: Flame,
  sun: Sun,
  "message-circle": MessageCircle,
  "bar-chart-3": BarChart3,
  "user-plus": UserPlus,
  "clipboard-list": ClipboardList,
  heart: Heart,
};

export function getAchievementIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || Award;
}

const TIER_COLOR_MAP: Record<AchievementTier, string> = {
  bronze: "text-amber-700 bg-amber-100 border-amber-300",
  silver: "text-slate-500 bg-slate-100 border-slate-300",
  gold: "text-yellow-600 bg-yellow-100 border-yellow-400",
  platinum: "text-purple-600 bg-purple-100 border-purple-400",
};

export function getTierColorClass(tier: AchievementTier): string {
  return TIER_COLOR_MAP[tier] || "text-gray-500 bg-gray-100 border-gray-300";
}

const TIER_EMOJI: Record<AchievementTier, string> = {
  bronze: "\u{1F949}",
  silver: "\u{1F948}",
  gold: "\u{1F947}",
  platinum: "\u{1F48E}",
};

export function getTierEmoji(tier: AchievementTier): string {
  return TIER_EMOJI[tier] || "\u{1F3C6}";
}
