"use client";

import { MapPin, ExternalLink } from "lucide-react";

export function MapLink({ location }: { location: string }) {
  return (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-1 underline hover:text-foreground transition-colors"
    >
      <MapPin className="h-3.5 w-3.5" />
      {location}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
