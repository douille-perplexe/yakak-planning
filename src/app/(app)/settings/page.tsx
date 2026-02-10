import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Profile, NotificationPreference } from "@/lib/types";
import { AdminPanel } from "@/components/admin-panel";
import { NotificationPreferences } from "@/components/notification-preferences";

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

  const isAdmin = profile?.role === "admin";

  let pendingUsers: Profile[] = [];
  let approvedMembers: Profile[] = [];

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

    pendingUsers = (pending ?? []) as Profile[];
    approvedMembers = (members ?? []) as Profile[];
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

      {/* Notification preferences */}
      <NotificationPreferences
        preferences={(notifPrefs ?? []) as NotificationPreference[]}
      />

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
