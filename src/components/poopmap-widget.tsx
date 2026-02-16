"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star } from "lucide-react";
import Link from "next/link";
import { PoopMapPoop } from "@/lib/types";

interface PoopMapWidgetProps {
  poops: PoopMapPoop[];
  linked: boolean;
}

export function PoopMapWidget({ poops, linked }: PoopMapWidgetProps) {
  if (!linked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-5 w-5" />
            Poop Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Link your Poop Map account to see recent activity.
          </p>
          <Link href="/settings">
            <Button variant="outline" size="sm">
              Link Account
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const recent = poops.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Poop Map
          </span>
          <Link href="/poop-map">
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            No recent activity.
          </p>
        ) : (
          <div className="space-y-2">
            {recent.map((poop) => (
              <div
                key={poop.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">
                    {poop.username}
                  </span>
                  {poop.place && (
                    <span className="text-muted-foreground truncate">
                      @ {poop.place}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {poop.rating && (
                    <>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs">{poop.rating}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
