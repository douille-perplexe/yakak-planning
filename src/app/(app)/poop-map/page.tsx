import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { PoopMapToken, PoopMapPoop } from "@/lib/types";
import { fetchMyPoops, fetchFeed } from "@/lib/poopmap";
import { PoopMapFeed } from "@/components/poopmap-feed";
import { AddPoopForm } from "@/components/add-poop-form";

export default async function PoopMapPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user!.id)
    .single();

  const { data: tokenRow } = await supabase
    .from("poopmap_tokens")
    .select("*")
    .eq("user_id", profile!.id)
    .single();

  const token = tokenRow as PoopMapToken | null;

  if (!token) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-foreground">Poop Map</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              Link your Poop Map account to get started.
            </p>
            <Link href="/settings" className="mt-4 inline-block">
              <Button variant="outline">Go to Settings</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  let myPoops: PoopMapPoop[] = [];
  let feedPoops: PoopMapPoop[] = [];

  try {
    myPoops = await fetchMyPoops(token.device_token);
  } catch {
    // API error — show empty
  }

  try {
    feedPoops = await fetchFeed(token.device_token);
  } catch {
    // API error — show empty
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Poop Map</h1>
        <AddPoopForm />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          My Poops
        </h2>
        <PoopMapFeed poops={myPoops} type="mine" />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Friends&apos; Feed
        </h2>
        <PoopMapFeed poops={feedPoops} type="friends" />
      </div>
    </div>
  );
}
