"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarPlus,
  CalendarClock,
  CalendarX,
  MessageSquare,
  UserCheck,
  BarChart3,
  CheckCircle,
  Clock,
  Activity,
  Award,
  Tv,
  MapPin,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Notification, NotificationType } from "@/lib/types";
import {
  getNotifications,
  markNotifRead,
  markAllNotifsRead,
} from "@/app/actions/notifications";

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  event_created: CalendarPlus,
  event_updated: CalendarClock,
  event_cancelled: CalendarX,
  new_comment: MessageSquare,
  new_rsvp: UserCheck,
  poll_created: BarChart3,
  poll_closed: CheckCircle,
  event_reminder: Clock,
  availability_signal: Activity,
  achievement_unlocked: Award,
  twitch_live: Tv,
  new_poop: MapPin,
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface NotificationBellProps {
  initialNotifications: Notification[];
  initialUnreadCount: number;
}

export function NotificationBell({
  initialNotifications,
  initialUnreadCount,
}: NotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [open, setOpen] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [clickingNotifId, setClickingNotifId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await getNotifications();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  }, []);

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleClickNotification = async (notif: Notification) => {
    if (clickingNotifId) return;
    setClickingNotifId(notif.id);
    if (!notif.read) {
      await markNotifRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    setClickingNotifId(null);
    if (notif.type === "new_poop") {
      router.push("/poop-map");
    } else if (notif.type === "twitch_live" || notif.type === "achievement_unlocked") {
      router.push("/");
    } else if (notif.reference_id) {
      router.push(`/events/${notif.reference_id}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAllRead) return;
    setMarkingAllRead(true);
    await markAllNotifsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    setMarkingAllRead(false);
  };

  const badgeText = unreadCount > 99 ? "99+" : unreadCount.toString();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {badgeText}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAllRead}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              {markingAllRead && <Loader2 className="h-3 w-3 animate-spin" />}
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => {
                const Icon = TYPE_ICONS[notif.type] || Bell;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClickNotification(notif)}
                    disabled={clickingNotifId === notif.id}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted ${
                      !notif.read ? "bg-primary/5" : ""
                    }`}
                  >
                    {clickingNotifId === notif.id ? (
                      <Loader2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground animate-spin" />
                    ) : (
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                    {!notif.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
