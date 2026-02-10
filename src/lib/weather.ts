import { unstable_cache } from "next/cache";
import type { EventWeather } from "@/lib/types";

export { getWeatherIcon } from "@/lib/weather-icons";

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

// --- Geocoding (cached 7 days) ---

async function _geocodeLocation(
  location: string
): Promise<{ lat: number; lon: number } | null> {
  if (!OPENWEATHER_API_KEY) return null;

  try {
    const res = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${OPENWEATHER_API_KEY}`
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    return { lat: data[0].lat, lon: data[0].lon };
  } catch {
    return null;
  }
}

const geocodeLocation = unstable_cache(
  _geocodeLocation,
  ["weather-geo"],
  { revalidate: 604800, tags: ["weather-geo"] }
);

// --- Forecast (cached 3 hours) ---

interface ForecastEntry {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  weather: { main: string; description: string; icon: string }[];
  wind: { speed: number };
}

async function _getWeatherForecast(
  lat: number,
  lon: number
): Promise<ForecastEntry[]> {
  if (!OPENWEATHER_API_KEY) return [];

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`
    );
    if (!res.ok) return [];

    const data = await res.json();
    return data.list ?? [];
  } catch {
    return [];
  }
}

const getWeatherForecast = unstable_cache(
  _getWeatherForecast,
  ["weather-forecast"],
  { revalidate: 10800, tags: ["weather-forecast"] }
);

// --- Main entry point ---

export async function getWeatherForEvent(
  location: string,
  eventDate: string
): Promise<EventWeather | null> {
  if (!OPENWEATHER_API_KEY) return null;

  const eventTime = new Date(eventDate).getTime();
  const now = Date.now();

  // Skip past events
  if (eventTime < now) return null;

  // Skip events more than 5 days out
  const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
  if (eventTime - now > fiveDaysMs) return null;

  const coords = await geocodeLocation(location);
  if (!coords) return null;

  const forecast = await getWeatherForecast(coords.lat, coords.lon);
  if (forecast.length === 0) return null;

  // Find the closest forecast entry to the event time
  let closest: ForecastEntry | null = null;
  let closestDiff = Infinity;

  for (const entry of forecast) {
    const diff = Math.abs(entry.dt * 1000 - eventTime);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = entry;
    }
  }

  if (!closest || !closest.weather?.[0]) return null;

  return {
    temp: Math.round(closest.main.temp),
    feelsLike: Math.round(closest.main.feels_like),
    description: closest.weather[0].description,
    icon: closest.weather[0].icon,
    main: closest.weather[0].main,
    humidity: closest.main.humidity,
    windSpeed: closest.wind.speed,
  };
}

// --- Outdoor detection ---

export function isOutdoorEvent(
  categories: { name: string }[]
): boolean {
  return categories.some((c) => c.name === "Outdoor");
}

// --- Check if event is within forecast range ---

export function isWithinForecastRange(eventDate: string): boolean {
  const eventTime = new Date(eventDate).getTime();
  const now = Date.now();
  const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
  return eventTime > now && eventTime - now <= fiveDaysMs;
}
