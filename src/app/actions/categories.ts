"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_categories")
    .select("*")
    .order("position", { ascending: true });

  if (error) return [];
  return data;
}

export async function createCategory(input: {
  name: string;
  icon?: string;
  color?: string;
}) {
  const supabase = await createClient();

  const name = input.name?.trim();
  if (!name || name.length > 50) {
    return { success: false, error: "Name is required (max 50 characters)" };
  }

  // Auto-assign next position
  const { data: maxPos } = await supabase
    .from("activity_categories")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const nextPosition = (maxPos?.position ?? -1) + 1;

  const { error } = await supabase.from("activity_categories").insert({
    name,
    icon: input.icon?.trim() || "",
    color: input.color?.trim() || "",
    position: nextPosition,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A category with this name already exists" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/events");
  revalidatePath("/stats");
  return { success: true };
}

export async function updateCategory(
  id: string,
  input: { name?: string; icon?: string; color?: string }
) {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name || name.length > 50) {
      return { success: false, error: "Name is required (max 50 characters)" };
    }
    updates.name = name;
  }
  if (input.icon !== undefined) updates.icon = input.icon.trim();
  if (input.color !== undefined) updates.color = input.color.trim();

  const { error } = await supabase
    .from("activity_categories")
    .update(updates)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A category with this name already exists" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/events");
  revalidatePath("/stats");
  return { success: true };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("activity_categories")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/events");
  revalidatePath("/stats");
  return { success: true };
}
