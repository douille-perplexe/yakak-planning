"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function approveUser(profileId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ status: "approved" })
    .eq("id", profileId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function denyUser(profileId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ status: "denied" })
    .eq("id", profileId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function removeMember(profileId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ status: "removed" })
    .eq("id", profileId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}
