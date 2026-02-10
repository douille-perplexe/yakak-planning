import {
  Sun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  Snowflake,
  CloudFog,
  CloudSun,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const WEATHER_ICON_MAP: Record<string, LucideIcon> = {
  Clear: Sun,
  Clouds: Cloud,
  Rain: CloudRain,
  Drizzle: CloudDrizzle,
  Thunderstorm: CloudLightning,
  Snow: Snowflake,
  Mist: CloudFog,
  Haze: CloudFog,
  Fog: CloudFog,
};

export function getWeatherIcon(main: string): LucideIcon {
  return WEATHER_ICON_MAP[main] ?? CloudSun;
}
