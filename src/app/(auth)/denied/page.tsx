"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle } from "lucide-react";

export default function DeniedPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>

            <div>
              <h1 className="text-xl font-bold text-foreground">
                Request Denied
              </h1>
              <p className="text-muted-foreground mt-2">
                Your request to join Yakak was not approved. Contact the admin if
                you think this is a mistake.
              </p>
            </div>

            <Button variant="ghost" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
