import { Calendar } from "lucide-react";

export function CalendarPanel() {
  // Google Calendar public embed — uses the user's primary calendar.
  // The src param ctz sets timezone to London. The user must be logged
  // into Google in the same browser for their personal calendar to show.
  // Using the full embed URL with mode=AGENDA for a clean agenda view.
  const calendarSrc = [
    "https://calendar.google.com/calendar/embed",
    "?mode=AGENDA",
    "&showTitle=0",
    "&showNav=1",
    "&showDate=1",
    "&showPrint=0",
    "&showTabs=0",
    "&showCalendars=0",
    "&showTz=0",
    "&ctz=Europe/London",
    "&bgcolor=%23ffffff",
  ].join("");

  return (
    <div className="panel-card p-4 h-full flex flex-col" data-testid="calendar-panel">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-primary" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Google Calendar
        </p>
      </div>
      <div className="flex-1 rounded-lg overflow-hidden bg-white min-h-[320px]">
        <iframe
          src={calendarSrc}
          className="w-full h-full min-h-[320px] border-0"
          title="Google Calendar"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          loading="lazy"
          data-testid="calendar-iframe"
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        Sign into Google in this browser to see your calendar
      </p>
    </div>
  );
}
