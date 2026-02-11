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
