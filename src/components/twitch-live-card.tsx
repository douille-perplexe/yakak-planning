"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Tv } from "lucide-react";
import { TwitchChannel } from "@/lib/types";

interface TwitchLiveCardProps {
  channels: TwitchChannel[];
}

export function TwitchLiveCard({ channels }: TwitchLiveCardProps) {
  if (channels.length === 0) return null;

  const liveChannels = channels.filter((c) => c.is_live);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Tv className="h-5 w-5" />
          Live Streams
        </CardTitle>
      </CardHeader>
      <CardContent>
        {liveChannels.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            No one is streaming right now
          </p>
        ) : (
          <div className="space-y-3">
            {liveChannels.map((channel) => (
              <a
                key={channel.id}
                href={`https://twitch.tv/${channel.channel_name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage
                    src={channel.profile_image_url ?? undefined}
                  />
                  <AvatarFallback>
                    {(channel.display_name ?? channel.channel_name)
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {channel.display_name ?? channel.channel_name}
                    </span>
                    <Badge
                      variant="destructive"
                      className="text-xs px-1.5 py-0 shrink-0"
                    >
                      LIVE
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 ml-auto">
                      <Eye className="h-3 w-3" />
                      {channel.current_viewer_count.toLocaleString()}
                    </span>
                  </div>
                  {channel.current_category && (
                    <Badge
                      variant="secondary"
                      className="text-xs mt-1 font-normal"
                    >
                      {channel.current_category}
                    </Badge>
                  )}
                  {channel.current_title && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {channel.current_title}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
