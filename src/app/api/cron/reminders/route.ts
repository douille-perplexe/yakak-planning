import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createNotifications, getEventRespondersIds } from "@/lib/notifications";
import { getWeatherForEvent, isOutdoorEvent } from "@/lib/weather";
import type { EventWeather } from "@/lib/types";

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
    .select("id, title, date, location, event_categories(category:activity_categories(name))")
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

    // Check for outdoor weather
    const cats = ((event as Record<string, unknown>).event_categories as { category: { name: string } }[] | null) ?? [];
    const categories = cats.map((ec) => ec.category).filter(Boolean);
    let weatherSuffix = "";
    let weather: EventWeather | null = null;
    if (isOutdoorEvent(categories)) {
      weather = await getWeatherForEvent(event.location, event.date);
      if (weather) {
        weatherSuffix = ` Weather: ${weather.temp}°C, ${weather.description}`;
      }
    }

    await createNotifications({
      type: "event_reminder",
      referenceId: event.id,
      message: `Reminder: ${event.title} is coming up soon!${weatherSuffix}`,
      recipientIds: responderIds,
      weatherHtml: weather
        ? `<img src="https://openweathermap.org/img/wn/${weather.icon}@2x.png" width="40" height="40" style="vertical-align:middle;" /><span style="font-size: 18px; font-weight: 600;">${weather.temp}°C</span> <span style="color: #6B7280;">${weather.description}</span>`
        : undefined,
    });

    processed++;
  }

  return NextResponse.json({
    success: true,
    processed,
    total: upcomingEvents?.length ?? 0,
  });
}
