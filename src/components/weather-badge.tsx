"use client";

import { useEffect, useState } from "react";
import { getWeatherIcon } from "@/lib/weather-icons";
import type { EventWeather } from "@/lib/types";

// --- Server variant (import and use directly with weather data) ---

export function WeatherBadge({ weather }: { weather: EventWeather }) {
  const Icon = getWeatherIcon(weather.main);

  return (
    <span className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
      <Icon className="h-3.5 w-3.5" />
      {weather.temp}°C
    </span>
  );
}

// --- Client variant (fetches from API) ---

export function WeatherBadgeClient({
  location,
  date,
}: {
  location: string;
  date: string;
}) {
  const [weather, setWeather] = useState<EventWeather | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch(
      `/api/weather?location=${encodeURIComponent(location)}&date=${encodeURIComponent(date)}`,
      { signal: controller.signal }
    )
      .then((res) => res.json())
      .then((data) => setWeather(data.weather))
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [location, date]);

  if (loading) {
    return (
      <span className="inline-block h-4 w-12 bg-muted rounded animate-pulse" />
    );
  }

  if (!weather) return null;

  return <WeatherBadge weather={weather} />;
}
