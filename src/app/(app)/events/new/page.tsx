import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreateEventForm } from "@/components/create-event-form";
import { getCategories } from "@/app/actions/categories";
import { ActivityCategory } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export default async function NewEventPage() {
  const categories = (await getCategories()) as ActivityCategory[];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasStrava = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (profile) {
      const { data: stravaToken } = await supabase
        .from("strava_tokens")
        .select("id")
        .eq("user_id", profile.id)
        .single();
      hasStrava = !!stravaToken;
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>

      <CreateEventForm categories={categories} hasStrava={hasStrava} />
    </div>
  );
}
