import {
  Dumbbell,
  Palette,
  Users,
  Trees,
  BookOpen,
  Coffee,
  Utensils,
  Plane,
  Moon,
  HeartPulse,
  Tag,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  palette: Palette,
  users: Users,
  trees: Trees,
  "book-open": BookOpen,
  coffee: Coffee,
  utensils: Utensils,
  plane: Plane,
  moon: Moon,
  "heart-pulse": HeartPulse,
};

const COLOR_MAP: Record<string, string> = {
  orange: "bg-orange-100 text-orange-800 border-orange-200",
  purple: "bg-purple-100 text-purple-800 border-purple-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  green: "bg-green-100 text-green-800 border-green-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  sky: "bg-sky-100 text-sky-800 border-sky-200",
  red: "bg-red-100 text-red-800 border-red-200",
  indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
  violet: "bg-violet-100 text-violet-800 border-violet-200",
  pink: "bg-pink-100 text-pink-800 border-pink-200",
};

export function getCategoryIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || Tag;
}

// Icons that correspond to physical / sport activity categories
const SPORT_ICONS = new Set(["dumbbell", "trees", "heart-pulse"]);

export function isSportCategory(iconName: string): boolean {
  return SPORT_ICONS.has(iconName);
}

export function getCategoryColorClass(color: string): string {
  return COLOR_MAP[color] || "bg-gray-100 text-gray-800 border-gray-200";
}

const BAR_COLOR_MAP: Record<string, string> = {
  orange: "bg-orange-400",
  purple: "bg-purple-400",
  blue: "bg-blue-400",
  green: "bg-green-400",
  yellow: "bg-yellow-400",
  sky: "bg-sky-400",
  red: "bg-red-400",
  indigo: "bg-indigo-400",
  violet: "bg-violet-400",
  pink: "bg-pink-400",
};

export function getCategoryBarColor(color: string): string {
  return BAR_COLOR_MAP[color] || "bg-primary";
}
