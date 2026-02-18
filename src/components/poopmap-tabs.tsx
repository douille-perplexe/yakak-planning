"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PoopMapFeed } from "@/components/poopmap-feed";
import type { PoopMapPoop } from "@/lib/types";
import type { MapBounds } from "@/lib/poopmap";
import { getMapPoops } from "@/app/actions/poopmap";

const PoopMapMap = dynamic(() => import("@/components/poopmap-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full rounded-lg bg-muted animate-pulse flex items-center justify-center">
      <span className="text-2xl">Loading map...</span>
    </div>
  ),
});

interface PoopMapTabsProps {
  myPoops: PoopMapPoop[];
  feedPoops: PoopMapPoop[];
  currentUserId: number;
}

export function PoopMapTabs({
  myPoops,
  feedPoops,
  currentUserId,
}: PoopMapTabsProps) {
  const [friendsPoops, setFriendsPoops] = useState<PoopMapPoop[]>([]);
  const [loading, setLoading] = useState(false);

  const handleBoundsChange = useCallback(async (bounds: MapBounds) => {
    setLoading(true);
    const result = await getMapPoops(bounds);
    setFriendsPoops(result.poops);
    setLoading(false);
  }, []);

  return (
    <Tabs defaultValue="friends">
      <TabsList className="w-full">
        <TabsTrigger value="friends" className="flex-1">
          Friends & Me
        </TabsTrigger>
        <TabsTrigger value="mine" className="flex-1">
          My Poops
        </TabsTrigger>
        <TabsTrigger value="feed" className="flex-1">
          Feed
        </TabsTrigger>
      </TabsList>

      <TabsContent value="friends" className="mt-4">
        {loading && friendsPoops.length === 0 && (
          <p className="text-sm text-muted-foreground mb-2">Loading pins...</p>
        )}
        <PoopMapMap
          poops={friendsPoops}
          onBoundsChange={handleBoundsChange}
          currentUserId={currentUserId}
        />
      </TabsContent>

      <TabsContent value="mine" className="mt-4">
        <PoopMapMap poops={myPoops} currentUserId={currentUserId} />
      </TabsContent>

      <TabsContent value="feed" className="mt-4">
        <PoopMapFeed poops={feedPoops} currentUserId={currentUserId} />
      </TabsContent>
    </Tabs>
  );
}
