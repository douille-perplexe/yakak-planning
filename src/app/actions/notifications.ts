"use server";

import { createClient } from "@/lib/supabase/server";
import { Notification } from "@/lib/types";

export async function getNotifications(): Promise<{
  notifications: Notification[];
  unreadCount: number;
}> {
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("read", false);

  return {
    notifications: (notifications ?? []) as Notification[],
    unreadCount: count ?? 0,
  };
}

export async function markNotifRead(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function markAllNotifsRead() {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("read", false);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
