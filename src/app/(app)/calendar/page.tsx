"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { Event, ActivityCategory } from "@/lib/types";
import { getCategoryBarColor } from "@/lib/category-utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_VISIBLE_EVENTS = 2;

interface EventWithCategories extends Event {
  categories: ActivityCategory[];
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventWithCategories[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

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
    const { data: eventCategories } = await supabase
      .from("event_categories")
      .select("event_id, category:activity_categories(*)")
      .in("event_id", eventIds);

    const categoryMap = new Map<string, ActivityCategory[]>();
    for (const ec of eventCategories ?? []) {
      const cat = ec.category as unknown as ActivityCategory;
      if (!cat) continue;
      const existing = categoryMap.get(ec.event_id) ?? [];
      existing.push(cat);
      categoryMap.set(ec.event_id, existing);
    }

    setEvents(
      eventsData.map((e) => ({
        ...e,
        categories: categoryMap.get(e.id) ?? [],
      }))
    );
  }, [year, month]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const firstDayOfMonth = new Date(year, month, 1);
  // getDay() returns 0 for Sunday; we want Monday = 0
  const startDay = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const getEventsForDay = (day: number) => {
    return events.filter((e) => {
      const eventDate = new Date(e.date);
      return eventDate.getDate() === day;
    });
  };

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day;

  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const selectedDayEvents =
    selectedDay !== null ? getEventsForDay(selectedDay) : [];

  const getBarColor = (event: EventWithCategories) => {
    if (event.categories.length > 0) {
      return getCategoryBarColor(event.categories[0].color);
    }
    return "bg-primary";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <Link href="/events/new">
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
            {/* Empty cells before first day */}
            {Array.from({ length: startDay }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="aspect-square sm:aspect-auto sm:min-h-[100px]"
              />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isSelected = selectedDay === day;
              const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
              const remaining = dayEvents.length - MAX_VISIBLE_EVENTS;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`rounded-lg flex flex-col items-start p-1 sm:p-1.5 text-sm transition-colors min-h-[44px] sm:aspect-auto sm:min-h-[100px] aspect-square ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday(day)
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
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected
                            ? "bg-primary-foreground"
                            : getBarColor(event)
                        }`}
                      />
                    ))}
                  </div>

                  {/* Desktop: event bars */}
                  <div className="hidden sm:flex flex-col gap-0.5 w-full min-w-0 overflow-hidden">
                    {visibleEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`rounded px-1 py-0.5 text-[10px] leading-tight font-medium truncate ${
                          isSelected
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : `${getBarColor(event)} text-white`
                        }`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {remaining > 0 && (
                      <span
                        className={`text-[10px] leading-tight px-1 ${
                          isSelected
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
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

      {/* Selected day detail */}
      {selectedDay !== null && (
        <Card>
          <CardContent className="py-4">
            <h3 className="font-semibold mb-3">
              {new Date(year, month, selectedDay).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h3>
            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-3">
                  No events this day
                </p>
                <Link
                  href={`/events/new?date=${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`}
                >
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Event
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {event.location}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
