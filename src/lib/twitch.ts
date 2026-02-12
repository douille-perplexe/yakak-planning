import { createServiceClient } from "@/lib/supabase/server";

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const TWITCH_HELIX_URL = "https://api.twitch.tv/helix";

interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_name: string;
  title: string;
  viewer_count: number;
  started_at: string;
  thumbnail_url: string;
}

interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  description: string;
  profile_image_url: string;
  broadcaster_type: string;
}

async function getAppToken(): Promise<string> {
  const supabase = await createServiceClient();

  // Check for a valid cached token (5-min safety margin)
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("twitch_app_tokens")
    .select("access_token, expires_at")
    .gt("expires_at", fiveMinFromNow)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    return existing.access_token;
  }

  // Request a new token
  const res = await fetch(TWITCH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    throw new Error(`Twitch token request failed: ${res.status}`);
  }

  const data = await res.json();
  const accessToken: string = data.access_token;
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  // Delete old tokens and store the new one
  await supabase.from("twitch_app_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("twitch_app_tokens").insert({
    access_token: accessToken,
    expires_at: expiresAt,
  });

  return accessToken;
}

async function getStreams(
  token: string,
  channelNames: string[]
): Promise<TwitchStream[]> {
  if (channelNames.length === 0) return [];

  const params = new URLSearchParams();
  for (const name of channelNames) {
    params.append("user_login", name);
  }

  const res = await fetch(`${TWITCH_HELIX_URL}/streams?${params}`, {
    headers: {
      "Client-Id": process.env.TWITCH_CLIENT_ID!,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Twitch getStreams failed: ${res.status}`);
  }

  const data = await res.json();
  return data.data as TwitchStream[];
}

async function getUsers(
  token: string,
  logins: string[]
): Promise<TwitchUser[]> {
  if (logins.length === 0) return [];

  const params = new URLSearchParams();
  for (const login of logins) {
    params.append("login", login);
  }

  const res = await fetch(`${TWITCH_HELIX_URL}/users?${params}`, {
    headers: {
      "Client-Id": process.env.TWITCH_CLIENT_ID!,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Twitch getUsers failed: ${res.status}`);
  }

  const data = await res.json();
  return data.data as TwitchUser[];
}

export async function validateTwitchChannel(
  channelName: string
): Promise<TwitchUser | null> {
  const token = await getAppToken();
  const users = await getUsers(token, [channelName.toLowerCase()]);
  return users.length > 0 ? users[0] : null;
}

export async function fetchLiveStatuses(
  channelNames: string[]
): Promise<Map<string, TwitchStream>> {
  if (channelNames.length === 0) return new Map();

  try {
    const token = await getAppToken();
    const streams = await getStreams(token, channelNames);
    const map = new Map<string, TwitchStream>();
    for (const stream of streams) {
      map.set(stream.user_login.toLowerCase(), stream);
    }
    return map;
  } catch {
    return new Map();
  }
}

export async function pollTwitchChannels() {
  const supabase = await createServiceClient();
  const token = await getAppToken();

  const { data: channels } = await supabase
    .from("twitch_channels")
    .select("*");

  if (!channels || channels.length === 0) {
    return { channels: [], streams: new Map<string, TwitchStream>() };
  }

  const channelNames = channels.map(
    (c: { channel_name: string }) => c.channel_name
  );
  const streams = await getStreams(token, channelNames);

  const streamMap = new Map<string, TwitchStream>();
  for (const stream of streams) {
    streamMap.set(stream.user_login.toLowerCase(), stream);
  }

  return { channels, streams: streamMap };
}

/**
 * Sync Twitch channel state: persist live status to DB, send notifications
 * for new streams, auto-create events. Designed to run on page load as a
 * fire-and-forget side effect (replaces the cron job).
 */
export async function syncTwitchChannels(
  dbChannels: { id: string; channel_name: string; display_name: string | null; current_stream_id: string | null; is_live: boolean; auto_create_events: boolean; added_by: string }[],
  liveStreams: Map<string, TwitchStream>
) {
  const { createNotifications, getAllApprovedMemberIds } = await import("@/lib/notifications");
  const supabase = await createServiceClient();

  for (const channel of dbChannels) {
    const stream = liveStreams.get(channel.channel_name.toLowerCase());
    const now = new Date().toISOString();

    if (stream) {
      const isNewStream = channel.current_stream_id !== stream.id;
      const displayName = channel.display_name || channel.channel_name;

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

      // Notify all members when a channel goes live
      if (isNewStream) {
        const category = stream.game_name ? ` — ${stream.game_name}` : "";
        getAllApprovedMemberIds()
          .then((memberIds) =>
            createNotifications({
              type: "twitch_live",
              referenceId: channel.id,
              message: `${displayName} is now live on Twitch!${category}`,
              recipientIds: memberIds,
            })
          )
          .catch(() => {});
      }

      // Auto-create event for new streams
      if (isNewStream && channel.auto_create_events) {
        const { count } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("twitch_stream_id", stream.id);

        if ((count ?? 0) === 0) {
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
      await supabase
        .from("twitch_channels")
        .update({ last_checked_at: now })
        .eq("id", channel.id);
    }
  }
}
