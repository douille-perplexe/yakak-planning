import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/strava";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/settings?strava=error", request.url)
    );
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.redirect(
        new URL("/settings?strava=error", request.url)
      );
    }

    const tokens = await exchangeCodeForTokens(code);

    await supabase.from("strava_tokens").upsert(
      {
        user_id: profile.id,
        strava_athlete_id: tokens.athlete.id,
        strava_username: tokens.athlete.username ?? null,
        strava_firstname: tokens.athlete.firstname,
        strava_lastname: tokens.athlete.lastname,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    return NextResponse.redirect(
      new URL("/settings?strava=connected", request.url)
    );
  } catch (err) {
    console.error("[strava-callback]", err);
    return NextResponse.redirect(
      new URL("/settings?strava=error", request.url)
    );
  }
}
