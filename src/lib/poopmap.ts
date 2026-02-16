import type { PoopMapPoop } from "@/lib/types";

const BASE_URL = "https://api.poopmap.net/api/v1";

interface DeviceRegistration {
  id: number;
  token: string;
}

interface PoopMapUserInfo {
  id: number;
  username: string;
}

interface MyPoopsResponse {
  poops: PoopMapPoop[];
  user: PoopMapUserInfo;
}

interface FeedResponse {
  poops: PoopMapPoop[];
}

function authHeader(deviceToken: string) {
  return { Authorization: `Token token=${deviceToken}` };
}

export async function registerDevice(): Promise<DeviceRegistration> {
  const res = await fetch(`${BASE_URL}/devices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Poop Map device registration failed: ${res.status}`);
  }

  const data = await res.json();
  return data.device as DeviceRegistration;
}

export async function loginUser(
  deviceToken: string,
  credentials: { email: string; password: string }
): Promise<PoopMapUserInfo> {
  const res = await fetch(`${BASE_URL}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(deviceToken),
    },
    body: JSON.stringify({
      user: {
        username: credentials.email,
        password: credentials.password,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Poop Map login failed: ${res.status}`);
  }

  return res.json();
}

export async function fetchMyPoops(
  deviceToken: string
): Promise<PoopMapPoop[]> {
  const res = await fetch(`${BASE_URL}/me/poops`, {
    headers: authHeader(deviceToken),
  });

  if (!res.ok) {
    throw new Error(`Poop Map fetchMyPoops failed: ${res.status}`);
  }

  const data: MyPoopsResponse = await res.json();
  return data.poops;
}

export async function fetchFeed(deviceToken: string): Promise<PoopMapPoop[]> {
  const res = await fetch(`${BASE_URL}/feed`, {
    headers: authHeader(deviceToken),
  });

  if (!res.ok) {
    throw new Error(`Poop Map fetchFeed failed: ${res.status}`);
  }

  const data: FeedResponse = await res.json();
  return data.poops;
}

export async function createPoop(
  deviceToken: string,
  data: {
    latitude: number;
    longitude: number;
    note?: string;
    place?: string;
    rating?: number;
  }
): Promise<PoopMapPoop> {
  const res = await fetch(`${BASE_URL}/poops.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(deviceToken),
    },
    body: JSON.stringify({ poop: data }),
  });

  if (!res.ok) {
    throw new Error(`Poop Map createPoop failed: ${res.status}`);
  }

  const result = await res.json();
  return result.poop;
}
