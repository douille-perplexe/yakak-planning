"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Settings, LogOut, BarChart3, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Profile, Notification } from "@/lib/types";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import Image from "next/image";
import logoIcon from "@/app/icon.png";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/poop-map", label: "Poop Map", icon: MapPin },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface NavBarProps {
  profile: Profile;
  notifications: Notification[];
  unreadCount: number;
}

export function NavBar({ profile, notifications, unreadCount }: NavBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-card">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
            <Image src={logoIcon} alt="Yakak" className="h-8 w-8 rounded-lg" width={32} height={32} />
            <span className="text-xl font-bold text-foreground">Yakak</span>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Notifications & Theme */}
          <div className="border-t border-border px-3 py-3 space-y-1">
            <div className="flex items-center gap-3 px-3">
              <NotificationBell
                initialNotifications={notifications}
                initialUnreadCount={unreadCount}
              />
              <span className="text-sm font-medium text-muted-foreground">
                Notifications
              </span>
            </div>
            <div className="flex items-center gap-3 px-3">
              <ThemeToggle />
              <span className="text-sm font-medium text-muted-foreground">
                Theme
              </span>
            </div>
          </div>

          {/* User section */}
          <div className="border-t border-border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full rounded-lg px-2 py-2 hover:bg-muted transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback>
                      {profile.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground truncate">
                      {profile.display_name}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Mobile top header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Image src={logoIcon} alt="Yakak" className="h-7 w-7 rounded-lg" width={28} height={28} />
            <span className="text-lg font-bold text-foreground">Yakak</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell
              initialNotifications={notifications}
              initialUnreadCount={unreadCount}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback>
                      {profile.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex items-center justify-around py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-colors min-w-[64px] ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer for desktop sidebar */}
      <div className="hidden md:block md:w-64 flex-shrink-0" />

      {/* Spacer for mobile top header */}
      <div className="md:hidden h-14" />
    </>
  );
}
