"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RecommendationTabsProps {
  children: [React.ReactNode, React.ReactNode, React.ReactNode];
  savedCount: number;
}

export function RecommendationTabs({ children, savedCount }: RecommendationTabsProps) {
  return (
    <Tabs defaultValue="discover">
      <TabsList>
        <TabsTrigger value="discover">Discover</TabsTrigger>
        <TabsTrigger value="community">Community Picks</TabsTrigger>
        <TabsTrigger value="saved" className="gap-1.5">
          My Saved
          {savedCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-primary/10 text-primary text-xs font-medium px-1.5">
              {savedCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="discover" className="mt-6">
        {children[0]}
      </TabsContent>
      <TabsContent value="community" className="mt-6">
        {children[1]}
      </TabsContent>
      <TabsContent value="saved" className="mt-6">
        {children[2]}
      </TabsContent>
    </Tabs>
  );
}
