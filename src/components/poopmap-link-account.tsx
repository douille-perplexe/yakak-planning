"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MapPin, Unlink } from "lucide-react";
import { PoopMapToken } from "@/lib/types";
import {
  linkPoopMapAccount,
  unlinkPoopMapAccount,
} from "@/app/actions/poopmap";

interface PoopMapLinkAccountProps {
  token: PoopMapToken | null;
}

export function PoopMapLinkAccount({ token }: PoopMapLinkAccountProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLink = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    const result = await linkPoopMapAccount(
      formData.get("email") as string,
      formData.get("password") as string
    );
    if (!result.success) {
      setError(result.error ?? "Failed to link account");
    } else {
      setLinkOpen(false);
    }
    setLoading(false);
  };

  const handleUnlink = async () => {
    if (!confirm("Unlink your Poop Map account?")) return;
    await unlinkPoopMapAccount();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Poop Map
          </span>
          {token ? (
            <Button variant="outline" size="sm" onClick={handleUnlink}>
              <Unlink className="mr-2 h-4 w-4" />
              Unlink
            </Button>
          ) : (
            <Dialog
              open={linkOpen}
              onOpenChange={(open) => {
                setLinkOpen(open);
                if (!open) setError(null);
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm">Link Account</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Link Poop Map Account</DialogTitle>
                </DialogHeader>
                <form action={handleLink} className="space-y-4">
                  <div>
                    <Label htmlFor="pm-email">Email</Label>
                    <Input
                      id="pm-email"
                      name="email"
                      type="email"
                      required
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pm-password">Password</Label>
                    <Input
                      id="pm-password"
                      name="password"
                      type="password"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your Poop Map credentials are used to authenticate once and
                    are not stored.
                  </p>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Linking..." : "Link Account"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {token ? (
          <p className="text-sm text-muted-foreground">
            Linked as{" "}
            <span className="font-medium text-foreground">
              {token.poopmap_username ?? "Unknown"}
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Link your Poop Map account to track and share poops with the group.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
