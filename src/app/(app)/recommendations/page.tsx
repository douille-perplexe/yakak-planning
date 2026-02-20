import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserRecommendations, getSavedRecommendations } from "@/app/actions/recommendations";
import { RecommendationSlotMachine } from "@/components/recommendation-slot-machine";
import { SubmitRecommendationForm } from "@/components/submit-recommendation-form";
import { UserRecommendationsFeed } from "@/components/user-recommendations-feed";
import { SavedRecommendations } from "@/components/saved-recommendations";
import { RecommendationTabs } from "./tabs";

export default async function RecommendationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [userRecs, savedRecs] = await Promise.all([
    getUserRecommendations(),
    getSavedRecommendations(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Discover</h1>
      <RecommendationTabs savedCount={savedRecs.length}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Stuck for ideas? Spin the wheel and discover something new!
          </p>
          <RecommendationSlotMachine />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              See what the group recommends
            </p>
            <SubmitRecommendationForm />
          </div>
          <UserRecommendationsFeed initialRecommendations={userRecs} />
        </div>

        <SavedRecommendations initialSaved={savedRecs} />
      </RecommendationTabs>
    </div>
  );
}
