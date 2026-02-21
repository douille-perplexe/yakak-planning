"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Unlink, CheckCircle2, AlertCircle } from "lucide-react";
import { disconnectStravaAction } from "@/app/actions/strava";
import { useSearchParams } from "next/navigation";

interface StravaTokenInfo {
  strava_firstname: string | null;
  strava_lastname: string | null;
  strava_username: string | null;
}

interface StravaLinkAccountProps {
  token: StravaTokenInfo | null;
  authUrl: string;
}

export function StravaLinkAccount({ token, authUrl }: StravaLinkAccountProps) {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const stravaParam = searchParams.get("strava");

  const handleDisconnect = async () => {
    if (!confirm("Disconnect your Strava account?")) return;
    setLoading(true);
    await disconnectStravaAction();
    setLoading(false);
  };

  const displayName = token
    ? [token.strava_firstname, token.strava_lastname].filter(Boolean).join(" ") ||
      token.strava_username ||
      "Unknown"
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            Strava
          </span>
          {token ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={loading}
            >
              <Unlink className="mr-2 h-4 w-4" />
              {loading ? "Disconnecting…" : "Disconnect"}
            </Button>
          ) : (
            <a href={authUrl}>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                Connect Strava
              </Button>
            </a>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stravaParam === "connected" && !token && null}
        {stravaParam === "error" && (
          <div className="flex items-center gap-2 text-sm text-destructive mb-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Connection failed. Please try again.
          </div>
        )}
        {stravaParam === "connected" && token && (
          <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Successfully connected!
          </div>
        )}
        {token ? (
          <p className="text-sm text-muted-foreground">
            Connected as{" "}
            <span className="font-medium text-foreground">{displayName}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Connect your Strava account to log activities and link them to
            events.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
