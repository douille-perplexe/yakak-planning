"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus, X } from "lucide-react";
import Link from "next/link";
import { Fab } from "@/components/fab";
import { Event, ActivityCategory, RsvpStatus } from "@/lib/types";
import {
  getCategoryBarColor,
  getCategoryColorClass,
  getCategoryIcon,
} from "@/lib/category-utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_VISIBLE_EVENTS = 2;

const BORDER_COLOR_MAP: Record<string, string> = {
  orange: "border-orange-400",
  purple: "border-purple-400",
  blue: "border-blue-400",
  green: "border-green-400",
  yellow: "border-yellow-400",
  sky: "border-sky-400",
  red: "border-red-400",
  indigo: "border-indigo-400",
  violet: "border-violet-400",
  pink: "border-pink-400",
};

const RSVP_CONFIG: Record<RsvpStatus, { label: string; className: string }> = {
  yes: { label: "Going", className: "bg-green-100 text-green-800 border-green-200" },
  maybe: { label: "Maybe", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  no: { label: "Not going", className: "bg-red-100 text-red-800 border-red-200" },
};

interface EventWithCategories extends Event {
  categories: ActivityCategory[];
  myRsvp: RsvpStatus | null;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventWithCategories[]>([]);
  const [modalDay, setModalDay] = useState<number | null>(null);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Load current user's profile ID once
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (profile) setMyProfileId(profile.id);
    });
  }, []);

  const fetchEvents = useCallback(async () => {
    const supabase = createClient();
    const startOfMonth = new Date(year, month, 1).toISOString();
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .is("deleted_at", null)
      .gte("date", startOfMonth)
      .lte("date", endOfMonth)
      .order("date", { ascending: true });

    if (!eventsData || eventsData.length === 0) {
      setEvents([]);
      return;
    }

    const eventIds = eventsData.map((e) => e.id);

    const [{ data: eventCategories }, { data: rsvpData }] = await Promise.all([
      supabase
        .from("event_categories")
        .select("event_id, category:activity_categories(*)")
        .in("event_id", eventIds),
      myProfileId
        ? supabase
            .from("rsvps")
            .select("event_id, status")
            .eq("user_id", myProfileId)
            .in("event_id", eventIds)
        : Promise.resolve({ data: [] as { event_id: string; status: string }[] }),
    ]);

    const categoryMap = new Map<string, ActivityCategory[]>();
    for (const ec of eventCategories ?? []) {
      const cat = ec.category as unknown as ActivityCategory;
      if (!cat) continue;
      const existing = categoryMap.get(ec.event_id) ?? [];
      existing.push(cat);
      categoryMap.set(ec.event_id, existing);
    }

    const rsvpMap = new Map<string, RsvpStatus>();
    for (const r of rsvpData ?? []) {
      rsvpMap.set(r.event_id, r.status as RsvpStatus);
    }

    setEvents(
      eventsData.map((e) => ({
        ...e,
        categories: categoryMap.get(e.id) ?? [],
        myRsvp: rsvpMap.get(e.id) ?? null,
      }))
    );
  }, [year, month, myProfileId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const firstDayOfMonth = new Date(year, month, 1);
  const startDay = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const getEventsForDay = (day: number) =>
    events.filter((e) => new Date(e.date).getDate() === day);

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day;

  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const getBarColor = (event: EventWithCategories) =>
    event.categories.length > 0
      ? getCategoryBarColor(event.categories[0].color)
      : "bg-primary";

  const modalEvents = modalDay !== null ? getEventsForDay(modalDay) : [];

  const modalDateStr =
    modalDay !== null
      ? new Date(year, month, modalDay).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })
      : "";

  const newEventHref =
    modalDay !== null
      ? `/events/new?date=${year}-${String(month + 1).padStart(2, "0")}-${String(modalDay).padStart(2, "0")}`
      : "/events/new";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <Link href="/events/new" className="hidden md:block">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Event
          </Button>
        </Link>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{monthName}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-2 sm:p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDay }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="aspect-square sm:aspect-auto sm:min-h-[100px]"
              />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
              const remaining = dayEvents.length - MAX_VISIBLE_EVENTS;

              return (
                <button
                  key={day}
                  onClick={() => setModalDay(day)}
                  className={`rounded-lg flex flex-col items-start p-1 sm:p-1.5 text-sm transition-colors min-h-[44px] sm:aspect-auto sm:min-h-[100px] aspect-square ${
                    isToday(day)
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-muted"
                  }`}
                >
                  <span className="text-xs sm:text-sm leading-none mb-0.5 sm:mb-1">
                    {day}
                  </span>

                  {/* Mobile: colored dots */}
                  <div className="flex gap-0.5 sm:hidden">
                    {dayEvents.slice(0, 3).map((event, j) => (
                      <div
                        key={j}
                        className={`h-1.5 w-1.5 rounded-full ${getBarColor(event)}`}
                      />
                    ))}
                  </div>

                  {/* Desktop: event bars */}
                  <div className="hidden sm:flex flex-col gap-0.5 w-full min-w-0 overflow-hidden">
                    {visibleEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`rounded px-1 py-0.5 text-[10px] leading-tight font-medium truncate ${getBarColor(event)} text-white`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {remaining > 0 && (
                      <span className="text-[10px] leading-tight px-1 text-muted-foreground">
                        +{remaining} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day detail modal */}
      <Dialog open={modalDay !== null} onOpenChange={(open) => !open && setModalDay(null)}>
        <DialogContent showCloseButton={false} className="max-w-md p-0 gap-0 overflow-hidden">
          {/* Modal header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
            <DialogTitle className="text-base font-semibold">
              {modalDateStr}
            </DialogTitle>
            <div className="flex items-center gap-1.5">
              <Link href={newEventHref} onClick={() => setModalDay(null)}>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  New Event
                </Button>
              </Link>
              <DialogClose asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>

          {/* Event list */}
          <ScrollArea className="max-h-[60vh]">
            {modalEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 px-5">
                <p className="text-sm text-muted-foreground">No events this day.</p>
                <Link href={newEventHref} onClick={() => setModalDay(null)}>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Event
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {modalEvents.map((event) => {
                  const time = new Date(event.date).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  const borderColor =
                    event.categories.length > 0
                      ? (BORDER_COLOR_MAP[event.categories[0].color] ?? "border-primary")
                      : "border-primary";
                  const rsvp = event.myRsvp ? RSVP_CONFIG[event.myRsvp] : null;

                  return (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      onClick={() => setModalDay(null)}
                    >
                      <div
                        className={`flex gap-3 px-4 py-3.5 hover:bg-muted transition-colors border-l-4 ${borderColor}`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          {/* Time + RSVP row */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 shrink-0" />
                              {time}
                            </span>
                            {rsvp && (
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${rsvp.className}`}
                              >
                                {rsvp.label}
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <p className="font-medium text-sm leading-snug">{event.title}</p>

                          {/* Description preview */}
                          {event.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {event.description}
                            </p>
                          )}

                          {/* Location */}
                          {event.location && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </span>
                          )}

                          {/* Category badges */}
                          {event.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {event.categories.map((cat) => {
                                const Icon = getCategoryIcon(cat.icon);
                                return (
                                  <Badge
                                    key={cat.id}
                                    className={
                                      getCategoryColorClass(cat.color) +
                                      " border text-[10px] px-1.5 py-0"
                                    }
                                  >
                                    <Icon className="h-2.5 w-2.5 mr-0.5" />
                                    {cat.name}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Fab href="/events/new" />
    </div>
  );
}
