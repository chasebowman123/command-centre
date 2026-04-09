import { Calendar } from "lucide-react";

export function CalendarPanel() {
  return (
    <div className="panel-card p-4 h-full flex flex-col" data-testid="calendar-panel">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-primary" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Google Calendar
        </p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[200px]">
        <Calendar className="w-8 h-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Calendar not connected</p>
        <a
          href="https://calendar.google.com/calendar/u/0/r"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
          data-testid="link-open-calendar"
        >
          Open Google Calendar →
        </a>
      </div>
    </div>
  );
}
