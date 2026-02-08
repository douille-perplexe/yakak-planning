"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function PendingPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center">
                <Clock className="h-8 w-8 text-accent-foreground" />
              </div>
            </div>

            <div>
              <h1 className="text-xl font-bold text-foreground">
                Waiting for Approval
              </h1>
              <p className="text-muted-foreground mt-2">
                Your request to join Yakak has been sent. An admin will review
                it shortly.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={handleRefresh}>
                Check again
              </Button>
              <Button variant="ghost" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
