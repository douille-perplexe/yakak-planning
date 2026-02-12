import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { pollTwitchChannels } from "@/lib/twitch";
import {
  createNotifications,
  getAllApprovedMemberIds,
} from "@/lib/notifications";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  let channels;
  let streams;
  try {
    const result = await pollTwitchChannels();
    channels = result.channels;
    streams = result.streams;
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to poll Twitch", detail: String(err) },
      { status: 500 }
    );
  }

  if (!channels || channels.length === 0) {
    return NextResponse.json({ success: true, processed: 0, total: 0 });
  }

  let eventsCreated = 0;

  for (const channel of channels) {
    const stream = streams.get(channel.channel_name.toLowerCase());
    const now = new Date().toISOString();

    if (stream) {
      const isNewStream = channel.current_stream_id !== stream.id;

      // Update channel with live data
      await supabase
        .from("twitch_channels")
        .update({
          is_live: true,
          current_stream_id: stream.id,
          current_title: stream.title,
          current_category: stream.game_name,
          current_viewer_count: stream.viewer_count,
          current_thumbnail_url: stream.thumbnail_url,
          stream_started_at: stream.started_at,
          last_checked_at: now,
        })
        .eq("id", channel.id);

      // Auto-create event for new streams
      if (isNewStream && channel.auto_create_events) {
        // Dedup: check if event already exists for this stream
        const { count } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("twitch_stream_id", stream.id);

        if ((count ?? 0) === 0) {
          const displayName = channel.display_name || channel.channel_name;
          const title = `${displayName} is live: ${stream.title}`.slice(0, 100);

          const { data: event } = await supabase
            .from("events")
            .insert({
              title,
              date: stream.started_at,
              location: `https://twitch.tv/${channel.channel_name}`,
              description: stream.game_name
                ? `Streaming ${stream.game_name}`
                : null,
              twitch_stream_id: stream.id,
              created_by: channel.added_by,
            })
            .select("id")
            .single();

          if (event) {
            eventsCreated++;
            // Notify all members (fire-and-forget)
            getAllApprovedMemberIds()
              .then((memberIds) =>
                createNotifications({
                  type: "event_created",
                  referenceId: event.id,
                  message: `${displayName} is now live on Twitch!`,
                  recipientIds: memberIds,
                  excludeUserId: channel.added_by,
                })
              )
              .catch(() => {});
          }
        }
      }
    } else if (channel.is_live) {
      // Channel went offline
      await supabase
        .from("twitch_channels")
        .update({
          is_live: false,
          current_stream_id: null,
          current_title: null,
          current_category: null,
          current_viewer_count: 0,
          current_thumbnail_url: null,
          stream_started_at: null,
          last_checked_at: now,
        })
        .eq("id", channel.id);
    } else {
      // Still offline, just update last_checked_at
      await supabase
        .from("twitch_channels")
        .update({ last_checked_at: now })
        .eq("id", channel.id);
    }
  }

  return NextResponse.json({
    success: true,
    processed: channels.length,
    eventsCreated,
  });
}
