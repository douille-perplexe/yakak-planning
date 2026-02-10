import { getWeatherIcon } from "@/lib/weather";
import type { EventWeather } from "@/lib/types";

interface WeatherDisplayProps {
  weather: EventWeather;
}

export function WeatherDisplay({ weather }: WeatherDisplayProps) {
  const Icon = getWeatherIcon(weather.main);

  return (
    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <span className="font-semibold text-foreground">
          {weather.temp}°C
        </span>
        <span className="text-muted-foreground capitalize">
          {weather.description}
        </span>
      </div>
      <div className="text-sm text-muted-foreground mt-1 ml-7">
        Feels like {weather.feelsLike}°C · Wind {weather.windSpeed} m/s ·
        Humidity {weather.humidity}%
      </div>
    </div>
  );
}
