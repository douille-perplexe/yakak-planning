import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Profile, NotificationPreference, ActivityCategory, TwitchChannel, AchievementDefinition, UserAchievementWithDefinition } from "@/lib/types";
import { AdminPanel } from "@/components/admin-panel";
import { NotificationPreferences } from "@/components/notification-preferences";
import { CategoryManager } from "@/components/category-manager";
import { TwitchChannelManager } from "@/components/twitch-channel-manager";
import { AchievementShowcase } from "@/components/achievement-showcase";
import { AdminAchievementGrant } from "@/components/admin-achievement-grant";
import { ThemeSetting } from "@/components/theme-setting";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user!.id)
    .single();

  const { data: notifPrefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .order("type");

  // Fetch achievement data
  const { data: achievementDefs } = await supabase
    .from("achievement_definitions")
    .select("*")
    .order("achievement_group")
    .order("tier_position");

  const { data: userAchievements } = await supabase
    .from("user_achievements")
    .select("*, achievement:achievement_definitions(*)")
    .eq("user_id", profile!.id);

  const isAdmin = profile?.role === "admin";

  let pendingUsers: Profile[] = [];
  let approvedMembers: Profile[] = [];
  let categories: ActivityCategory[] = [];
  let twitchChannels: TwitchChannel[] = [];

  if (isAdmin) {
    const { data: pending } = await supabase
      .from("profiles")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    const { data: members } = await supabase
      .from("profiles")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: true });

    const { data: cats } = await supabase
      .from("activity_categories")
      .select("*")
      .order("position", { ascending: true });

    const { data: twChannels } = await supabase
      .from("twitch_channels")
      .select("*")
      .order("created_at", { ascending: true });

    pendingUsers = (pending ?? []) as Profile[];
    approvedMembers = (members ?? []) as Profile[];
    categories = (cats ?? []) as ActivityCategory[];
    twitchChannels = (twChannels ?? []) as TwitchChannel[];
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {/* Profile section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-lg">
                {profile?.display_name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{profile?.display_name}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <Badge variant="secondary" className="mt-1">
                {profile?.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <ThemeSetting />

      {/* Achievements */}
      <AchievementShowcase
        allDefinitions={(achievementDefs ?? []) as AchievementDefinition[]}
        userAchievements={(userAchievements ?? []) as UserAchievementWithDefinition[]}
        currentFeaturedId={profile?.featured_badge_id ?? null}
      />

      {/* Notification preferences */}
      <NotificationPreferences
        preferences={(notifPrefs ?? []) as NotificationPreference[]}
      />

      {/* Category management (admin) */}
      {isAdmin && <CategoryManager categories={categories} />}

      {/* Twitch channel management (admin) */}
      {isAdmin && <TwitchChannelManager channels={twitchChannels} />}

      {/* Achievement grant (admin) */}
      {isAdmin && (
        <AdminAchievementGrant
          members={approvedMembers.map((m) => ({ id: m.id, display_name: m.display_name }))}
          definitions={(achievementDefs ?? []) as AchievementDefinition[]}
        />
      )}

      {/* Admin section */}
      {isAdmin && (
        <>
          <Separator />
          <AdminPanel
            pendingUsers={pendingUsers}
            approvedMembers={approvedMembers}
          />
        </>
      )}
    </div>
  );
}
