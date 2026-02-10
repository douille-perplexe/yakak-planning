import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createNotifications, getEventRespondersIds } from "@/lib/notifications";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  // Find events happening in the next 24 hours that are not deleted
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: upcomingEvents } = await supabase
    .from("events")
    .select("id, title")
    .is("deleted_at", null)
    .gte("date", now.toISOString())
    .lte("date", in24h.toISOString());

  let processed = 0;

  for (const event of upcomingEvents ?? []) {
    // Dedup: check if an event_reminder notification already exists for this event
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("type", "event_reminder")
      .eq("reference_id", event.id);

    if ((count ?? 0) > 0) continue;

    // Get yes/maybe responders
    const responderIds = await getEventRespondersIds(event.id);
    if (responderIds.length === 0) continue;

    await createNotifications({
      type: "event_reminder",
      referenceId: event.id,
      message: `Reminder: ${event.title} is coming up soon!`,
      recipientIds: responderIds,
    });

    processed++;
  }

  return NextResponse.json({
    success: true,
    processed,
    total: upcomingEvents?.length ?? 0,
  });
}
