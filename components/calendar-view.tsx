"use client";

import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmailThreadCard } from "./email-thread-card";
import type { EmailThread } from "@/lib/microsoft-graph";
import type { EmailMetadata } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useLanguage } from "./language-provider";
import {
  CalendarDays,
  AlertCircle,
  BellRing,
  CalendarClock,
} from "lucide-react";

interface CalendarViewProps {
  threads: EmailThread[];
  emailsMetadata: Record<string, EmailMetadata>;
  onUpdateMetadata: (emailId: string, updates: Partial<EmailMetadata>) => void;
  onThreadUpdated: (thread: EmailThread) => void;
  onRefresh: () => void;
}

type CalendarFilter = "all" | "snooze" | "due";

type CalendarEvent = {
  type: "snooze" | "due";
  thread: EmailThread;
  emailId: string;
  date: Date;
};

export function CalendarView({
  threads,
  emailsMetadata,
  onUpdateMetadata,
  onThreadUpdated,
  onRefresh,
}: CalendarViewProps) {
  const { t, language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [activeFilter, setActiveFilter] = useState<CalendarFilter>("all");

  const locale = language === "en" ? enUS : ptBR;

  const getDateKey = (date: Date) => date.toDateString();

  const calendarEventsMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const addedEvents = new Set<string>();

    threads.forEach((thread) => {
      const isArchivedSpamOrDeleted = thread.emails.some((e) => {
        const isFolderArchived = [
          "archive",
          "spam",
          "deleted",
          "junkemail",
          "deleteditems",
        ].includes(e.folderType || "");

        const isMetadataArchived = ["archive", "spam", "deleted"].includes(
          emailsMetadata[e.id]?.column_id || "",
        );

        return isFolderArchived || isMetadataArchived;
      });

      if (isArchivedSpamOrDeleted) return;

      thread.emails.forEach((email) => {
        const meta = emailsMetadata[email.id];
        if (!meta) return;

        const addEvent = (type: "snooze" | "due", rawDate: string) => {
          const eventDate = new Date(rawDate);
          if (Number.isNaN(eventDate.getTime())) return;

          const dateKey = getDateKey(eventDate);
          const uniqueKey = `${dateKey}-${thread.id}-${email.id}-${type}`;

          if (addedEvents.has(uniqueKey)) return;
          addedEvents.add(uniqueKey);

          const existingEvents = map.get(dateKey) || [];

          existingEvents.push({
            type,
            thread,
            emailId: email.id,
            date: eventDate,
          });

          map.set(dateKey, existingEvents);
        };

        if (meta.snoozed_until) {
          addEvent("snooze", meta.snoozed_until);
        }

        if (meta.due_date) {
          addEvent("due", meta.due_date);
        }
      });
    });

    return map;
  }, [threads, emailsMetadata]);

  const calendarDateGroups = useMemo(() => {
    const snoozeOnly: Date[] = [];
    const dueOnly: Date[] = [];
    const both: Date[] = [];

    calendarEventsMap.forEach((events, dateKey) => {
      const hasSnooze = events.some((event) => event.type === "snooze");
      const hasDue = events.some((event) => event.type === "due");
      const date = new Date(dateKey);

      if (hasSnooze && hasDue) {
        both.push(date);
      } else if (hasSnooze) {
        snoozeOnly.push(date);
      } else if (hasDue) {
        dueOnly.push(date);
      }
    });

    return {
      snoozeOnly,
      dueOnly,
      both,
    };
  }, [calendarEventsMap]);

  const selectedDateEvents = selectedDate
    ? calendarEventsMap.get(getDateKey(selectedDate)) || []
    : [];

  const filteredSelectedDateEvents = selectedDateEvents.filter((event) => {
    if (activeFilter === "all") return true;
    return event.type === activeFilter;
  });

  const selectedDaySummary = useMemo(() => {
    const uniqueThreadIds = new Set(selectedDateEvents.map((e) => e.thread.id));
    const snoozeCount = selectedDateEvents.filter(
      (event) => event.type === "snooze",
    ).length;
    const dueCount = selectedDateEvents.filter(
      (event) => event.type === "due",
    ).length;

    return {
      totalThreads: uniqueThreadIds.size,
      snoozeCount,
      dueCount,
    };
  }, [selectedDateEvents]);

  const groupedThreadsForSelectedDate = useMemo(() => {
    const map = new Map<
      string,
      {
        thread: EmailThread;
        events: CalendarEvent[];
      }
    >();

    filteredSelectedDateEvents.forEach((event) => {
      const existing = map.get(event.thread.id);

      if (existing) {
        existing.events.push(event);
      } else {
        map.set(event.thread.id, {
          thread: event.thread,
          events: [event],
        });
      }
    });

    return Array.from(map.values());
  }, [filteredSelectedDateEvents]);

  const selectedDateLabel = selectedDate
    ? format(
        selectedDate,
        language === "en" ? "MMMM d, yyyy" : "d 'de' MMMM, yyyy",
        { locale },
      )
    : t("calendar_select_day");

  const activeFilterLabel =
    activeFilter === "all"
      ? t("calendar_all")
      : activeFilter === "snooze"
        ? t("calendar_snooze")
        : t("calendar_due_date");

  return (
    <div className="max-w-6xl mx-auto py-4 pt-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-4 mb-8 bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-slate-200/50">
        <div className="h-14 w-14 bg-blue-50 rounded-xl shadow-sm border border-blue-100 flex items-center justify-center text-blue-500">
          <CalendarDays className="h-6 w-6" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            {t("calendar_title")}
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            {t("calendar_subtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8 items-start">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 sticky top-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={locale}
            className="w-full flex justify-center"
            modifiers={{
              snoozeOnly: calendarDateGroups.snoozeOnly,
              dueOnly: calendarDateGroups.dueOnly,
              both: calendarDateGroups.both,
            }}
            modifiersStyles={{
              snoozeOnly: {
                fontWeight: "bold",
                backgroundColor: "#eef2ff",
                color: "#4f46e5",
                border: "1px solid #a5b4fc",
              },
              dueOnly: {
                fontWeight: "bold",
                backgroundColor: "#fff7ed",
                color: "#ea580c",
                border: "1px solid #fdba74",
              },
              both: {
                fontWeight: "bold",
                backgroundColor: "#ecfdf5",
                color: "#059669",
                border: "1px solid #6ee7b7",
              },
            }}
          />

          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              {t("calendar_legend")}
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="h-3 w-3 rounded-full bg-indigo-100 border border-indigo-300" />
                {t("calendar_legend_snooze")}
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <span className="h-3 w-3 rounded-full bg-orange-100 border border-orange-300" />
                {t("calendar_legend_due")}
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <span className="h-3 w-3 rounded-full bg-emerald-100 border border-emerald-300" />
                {t("calendar_legend_both")}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-slate-200/50">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                  <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-sm">
                    {selectedDateLabel}
                  </span>
                </h3>

                <p className="text-xs text-slate-400 font-medium mt-2">
                  {t("calendar_showing")}: {activeFilterLabel}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("all")}
                  className="rounded-xl"
                >
                  {t("calendar_all")}
                </Button>

                <Button
                  variant={activeFilter === "snooze" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("snooze")}
                  className="rounded-xl"
                >
                  <BellRing className="h-3.5 w-3.5 mr-1.5" />
                  {t("calendar_snooze")}
                </Button>

                <Button
                  variant={activeFilter === "due" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("due")}
                  className="rounded-xl"
                >
                  <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                  {t("calendar_due_date")}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-3">
                <p className="text-[11px] uppercase font-bold text-slate-400 mb-1">
                  {t("calendar_emails")}
                </p>
                <p className="text-xl font-bold text-slate-800">
                  {selectedDaySummary.totalThreads}
                </p>
              </div>

              <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-3">
                <p className="text-[11px] uppercase font-bold text-indigo-400 mb-1">
                  {t("calendar_snoozes")}
                </p>
                <p className="text-xl font-bold text-indigo-700">
                  {selectedDaySummary.snoozeCount}
                </p>
              </div>

              <div className="bg-orange-50 rounded-xl border border-orange-100 p-3">
                <p className="text-[11px] uppercase font-bold text-orange-400 mb-1">
                  {t("calendar_due_dates")}
                </p>
                <p className="text-xl font-bold text-orange-700">
                  {selectedDaySummary.dueCount}
                </p>
              </div>
            </div>
          </div>

          {groupedThreadsForSelectedDate.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white/50 backdrop-blur-md rounded-3xl border border-dashed border-slate-300 shadow-sm">
              <div className="h-12 w-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3">
                <AlertCircle className="h-6 w-6" />
              </div>
              <p className="text-slate-500 font-medium">
                {selectedDateEvents.length === 0
                  ? t("calendar_no_events")
                  : t("calendar_no_filtered_events")}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {groupedThreadsForSelectedDate.map(({ thread, events }) => {
                const hasSnooze = events.some(
                  (event) => event.type === "snooze",
                );
                const hasDue = events.some((event) => event.type === "due");

                const snoozeEvent = events.find(
                  (event) => event.type === "snooze",
                );

                return (
                  <div key={thread.id} className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {hasSnooze && snoozeEvent && (
                        <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-lg">
                          <BellRing className="h-3 w-3 mr-1" />
                          {t("calendar_wakes_at")}{" "}
                          {format(snoozeEvent.date, "HH:mm", { locale })}
                        </Badge>
                      )}

                      {hasDue && (
                        <Badge className="bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 rounded-lg">
                          <CalendarClock className="h-3 w-3 mr-1" />
                          {t("calendar_due_on")}
                        </Badge>
                      )}
                    </div>

                    <EmailThreadCard
                      thread={thread}
                      emailsMetadata={emailsMetadata}
                      onUpdateMetadata={onUpdateMetadata}
                      onThreadUpdated={onThreadUpdated}
                      onEmailSent={onRefresh}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}