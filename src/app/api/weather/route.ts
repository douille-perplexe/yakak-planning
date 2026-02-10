import { NextResponse } from "next/server";
import { getWeatherForEvent } from "@/lib/weather";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location");
  const date = searchParams.get("date");

  if (!location || !date) {
    return NextResponse.json({ weather: null });
  }

  const weather = await getWeatherForEvent(location, date);

  return NextResponse.json({ weather });
}
