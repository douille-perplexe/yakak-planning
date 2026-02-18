"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PoopMapPoop } from "@/lib/types";
import type { MapBounds } from "@/lib/poopmap";

interface PoopMapMapProps {
  poops: PoopMapPoop[];
  onBoundsChange?: (bounds: MapBounds) => void;
  currentUserId?: number;
}

function createPoopIcon(isOwn: boolean) {
  return L.divIcon({
    html: `<span style="font-size:${isOwn ? "28px" : "24px"}">${isOwn ? "💩" : "💩"}</span>`,
    className: "poop-marker",
    iconSize: [isOwn ? 32 : 28, isOwn ? 32 : 28],
    iconAnchor: [isOwn ? 16 : 14, isOwn ? 16 : 14],
  });
}

function formatTimestamp(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function BoundsWatcher({
  onBoundsChange,
}: {
  onBoundsChange: (bounds: MapBounds) => void;
}) {
  const map = useMap();

  useEffect(() => {
    function handleMoveEnd() {
      const b = map.getBounds();
      onBoundsChange({
        sw_lat: b.getSouthWest().lat,
        sw_lng: b.getSouthWest().lng,
        ne_lat: b.getNorthEast().lat,
        ne_lng: b.getNorthEast().lng,
        zoom: map.getZoom(),
      });
    }

    map.on("moveend", handleMoveEnd);
    // Fire once on mount
    handleMoveEnd();

    return () => {
      map.off("moveend", handleMoveEnd);
    };
  }, [map, onBoundsChange]);

  return null;
}

function FitBounds({ poops }: { poops: PoopMapPoop[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || poops.length === 0) return;
    fitted.current = true;

    const bounds = L.latLngBounds(
      poops.map((p) => [p.latitude, p.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, poops]);

  return null;
}

export default function PoopMapMap({
  poops,
  onBoundsChange,
  currentUserId,
}: PoopMapMapProps) {
  return (
    <>
      <style>{`
        .poop-marker {
          background: none !important;
          border: none !important;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
      <MapContainer
        center={[46.6, 2.3]}
        zoom={6}
        className="h-[500px] w-full rounded-lg z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onBoundsChange && <BoundsWatcher onBoundsChange={onBoundsChange} />}
        <FitBounds poops={poops} />
        {poops.map((poop) => {
          const isOwn = currentUserId != null && poop.user_id === currentUserId;
          return (
            <Marker
              key={poop.id}
              position={[poop.latitude, poop.longitude]}
              icon={createPoopIcon(isOwn)}
            >
              <Popup>
                <div className="text-sm space-y-1">
                  <p className="font-semibold">
                    {isOwn ? "You" : poop.username}
                  </p>
                  {poop.place && (
                    <p className="text-muted-foreground">{poop.place}</p>
                  )}
                  {poop.note && <p>{poop.note}</p>}
                  {poop.rating != null && poop.rating > 0 && (
                    <p>{"⭐".repeat(poop.rating)}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(poop.created_at)}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </>
  );
}
