import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, MapPin, ExternalLink, AlertCircle } from "lucide-react";

interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  location?: string | null;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function timeStr(iso: string, allDay: boolean): string {
  if (allDay) return "All day";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function groupByDay(events: CalEvent[]): { label: string; date: string; events: CalEvent[] }[] {
  const map = new Map<string, CalEvent[]>();
  for (const ev of events) {
    const key = new Date(ev.start).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return Array.from(map.entries()).map(([dateStr, evs]) => ({
    label: dayLabel(evs[0].start),
    date: dateStr,
    events: evs,
  }));
}

export function CalendarPanel() {
  const { data, isLoading, error } = useQuery<{ events: CalEvent[]; error?: string }>({
    queryKey: ["/api/calendar"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/calendar");
        return res.json();
      } catch (e: any) {
        // If it's a 401 (not authenticated), return a specific error
        if (e.message?.includes("401")) {
          return { events: [], error: "Not authenticated" };
        }
        return { events: [], error: e.message || "Failed to load calendar" };
      }
    },
    staleTime: 120000,
    refetchInterval: 120000,
    retry: false,
  });

  const notConfigured = !isLoading && data?.error === "GCAL_ICAL_URL not set";
  const hasError = !isLoading && data?.error && data.error !== "GCAL_ICAL_URL not set";
  const groups = data?.events ? groupByDay(data.events) : [];

  return (
    <div className="panel-card p-4 h-full flex flex-col" data-testid="calendar-panel">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Calendar
          </p>
        </div>
        <a
          href="https://calendar.google.com/calendar/u/0/r"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground/50 hover:text-primary transition-colors"
          title="Open Google Calendar"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="flex-1 overflow-y-auto -mr-1 pr-1">
        {isLoading && (
          <div className="space-y-2 mt-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 rounded bg-muted/30 animate-pulse" />
            ))}
          </div>
        )}

        {notConfigured && (
          <div className="flex flex-col items-center justify-center gap-3 h-full min-h-[160px]">
            <Calendar className="w-8 h-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground text-center">Calendar not connected</p>
            <a
              href="https://calendar.google.com/calendar/u/0/r"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Open Google Calendar →
            </a>
          </div>
        )}

        {hasError && (
          <div className="flex flex-col items-center justify-center gap-2 h-full min-h-[160px]">
            <AlertCircle className="w-6 h-6 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground text-center">Could not load calendar</p>
            <p className="text-[10px] text-muted-foreground/50 text-center max-w-[200px]">{data?.error}</p>
          </div>
        )}

        {!isLoading && !notConfigured && !hasError && groups.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No upcoming events</p>
        )}

        {!isLoading && !notConfigured && !hasError && groups.length > 0 && (
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.date}>
                {/* Day label */}
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1
                  ${group.label === "Today" ? "text-primary" : "text-muted-foreground/60"}`}>
                  {group.label}
                </p>

                {/* Events for this day */}
                <div className="space-y-0.5">
                  {group.events.map((ev) => (
                    <div
                      key={ev.id}
                      className={`flex items-start gap-2.5 px-2 py-1.5 rounded-lg
                        ${group.label === "Today" ? "bg-primary/5 border border-primary/10" : "hover:bg-muted/30"}
                        transition-colors`}
                      data-testid={`cal-event-${ev.id}`}
                    >
                      <span className="text-[11px] tabular-nums text-muted-foreground shrink-0 pt-px w-12 text-right">
                        {timeStr(ev.start, ev.allDay)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug truncate font-medium">{ev.title}</p>
                        {ev.location && (
                          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            {ev.location}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
