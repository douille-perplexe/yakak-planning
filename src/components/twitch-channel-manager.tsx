"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Tv, Loader2 } from "lucide-react";
import { TwitchChannel } from "@/lib/types";
import {
  addTwitchChannel,
  removeTwitchChannel,
  toggleAutoEvents,
} from "@/app/actions/twitch";

interface TwitchChannelManagerProps {
  channels: TwitchChannel[];
}

export function TwitchChannelManager({ channels }: TwitchChannelManagerProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (formData: FormData) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    const result = await addTwitchChannel(formData.get("channel") as string);
    if (!result.success) {
      setError(result.error ?? "Failed to add channel");
    } else {
      setAddOpen(false);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (deletingId) return;
    if (!confirm(`Remove ${name} from monitored channels?`)) return;
    setDeletingId(id);
    await removeTwitchChannel(id);
    setDeletingId(null);
  };

  const handleToggleAutoEvents = async (id: string, enabled: boolean) => {
    if (togglingId) return;
    setTogglingId(id);
    await toggleAutoEvents(id, enabled);
    setTogglingId(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Tv className="h-5 w-5" />
            Twitch Channels
          </span>
          <Dialog
            open={addOpen}
            onOpenChange={(open) => {
              setAddOpen(open);
              if (!open) setError(null);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Twitch Channel</DialogTitle>
              </DialogHeader>
              <form action={handleAdd} className="space-y-4">
                <div>
                  <Label htmlFor="add-channel">Channel Name</Label>
                  <Input
                    id="add-channel"
                    name="channel"
                    maxLength={25}
                    required
                    placeholder="e.g., shroud"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The Twitch username (login name) of the channel
                  </p>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validating...</> : "Add Channel"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {channels.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No Twitch channels monitored yet.
          </p>
        ) : (
          <div className="space-y-3">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={channel.profile_image_url ?? undefined} />
                    <AvatarFallback>
                      {(channel.display_name ?? channel.channel_name)
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {channel.display_name ?? channel.channel_name}
                      </span>
                      {channel.is_live && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0">
                          LIVE
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {channel.channel_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`auto-${channel.id}`}
                      className="text-xs text-muted-foreground"
                    >
                      Auto-events
                    </Label>
                    <Switch
                      id={`auto-${channel.id}`}
                      checked={channel.auto_create_events}
                      disabled={togglingId === channel.id}
                      onCheckedChange={(checked) =>
                        handleToggleAutoEvents(channel.id, checked)
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    disabled={deletingId === channel.id}
                    onClick={() =>
                      handleDelete(
                        channel.id,
                        channel.display_name ?? channel.channel_name
                      )
                    }
                  >
                    {deletingId === channel.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
