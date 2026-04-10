import { useState } from "react";
import { Mail, Calendar, ExternalLink } from "lucide-react";

// ── Quick Gmail compose ───────────────────────────────────────────────────────
export function QuickGmailPanel() {
  const [to, setTo]         = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody]     = useState("");

  const handleOpen = () => {
    const params = new URLSearchParams();
    params.set("view", "cm");
    params.set("fs",   "1");
    if (to)      params.set("to",   to);
    if (subject) params.set("su",   subject);
    if (body)    params.set("body", body);
    window.open(`https://mail.google.com/mail/u/0/?${params.toString()}`, "_blank");
  };

  const inputCls =
    "w-full bg-muted/40 border border-border/60 rounded-lg px-3 py-1.5 text-sm " +
    "placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary/40 " +
    "focus:bg-muted/60 transition-colors";

  return (
    <div className="panel-card p-4 flex flex-col gap-2.5" data-testid="quick-gmail-panel">
      <div className="flex items-center gap-2 mb-0.5">
        <Mail className="w-4 h-4 text-primary" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Gmail
        </p>
      </div>

      <input
        value={to}
        onChange={e => setTo(e.target.value)}
        placeholder="To"
        className={inputCls}
        data-testid="input-gmail-to"
      />
      <input
        value={subject}
        onChange={e => setSubject(e.target.value)}
        placeholder="Subject"
        className={inputCls}
        data-testid="input-gmail-subject"
      />
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Message..."
        rows={3}
        className={`${inputCls} resize-none`}
        data-testid="input-gmail-body"
      />

      <button
        onClick={handleOpen}
        className="mt-0.5 w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg
          bg-primary/10 border border-primary/20 text-primary text-sm font-medium
          hover:bg-primary/15 transition-colors"
        data-testid="button-open-gmail"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        {!to && !subject && !body ? "Open Gmail Compose" : "Open Draft in Gmail"}
      </button>
    </div>
  );
}

// ── Quick Calendar event ──────────────────────────────────────────────────────
export function QuickCalendarPanel() {
  const [title, setTitle]       = useState("");
  const [date, setDate]         = useState("");
  const [time, setTime]         = useState("");
  const [location, setLocation] = useState("");

  const handleOpen = () => {
    let startStr = "";
    let endStr   = "";

    if (date && time) {
      const dateCompact = date.replace(/-/g, "");
      const timeCompact = time.replace(/:/g, "") + "00";
      startStr = `${dateCompact}T${timeCompact}`;
      // Default 1-hour duration
      try {
        const endDate = new Date(`${date}T${time}:00`);
        endDate.setHours(endDate.getHours() + 1);
        const endDateStr  = endDate.toISOString().slice(0, 10).replace(/-/g, "");
        const endTimeStr  = endDate.toISOString().slice(11, 16).replace(/:/g, "") + "00";
        endStr = `${endDateStr}T${endTimeStr}`;
      } catch {
        endStr = startStr;
      }
    } else if (date) {
      startStr = date.replace(/-/g, "");
      endStr   = startStr;
    }

    const params = new URLSearchParams();
    if (title)              params.set("text",     title);
    if (startStr && endStr) params.set("dates",    `${startStr}/${endStr}`);
    if (location)           params.set("location", location);

    window.open(
      `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`,
      "_blank"
    );
  };

  const inputCls =
    "w-full bg-muted/40 border border-border/60 rounded-lg px-3 py-1.5 text-sm " +
    "placeholder:text-muted-foreground/45 text-foreground focus:outline-none " +
    "focus:border-primary/40 focus:bg-muted/60 transition-colors";

  return (
    <div className="panel-card p-4 flex flex-col gap-2.5" data-testid="quick-calendar-panel">
      <div className="flex items-center gap-2 mb-0.5">
        <Calendar className="w-4 h-4 text-primary" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Calendar
        </p>
      </div>

      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Event title"
        className={inputCls}
        data-testid="input-cal-title"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className={inputCls}
          data-testid="input-cal-date"
        />
        <input
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
          className={inputCls}
          data-testid="input-cal-time"
        />
      </div>
      <input
        value={location}
        onChange={e => setLocation(e.target.value)}
        placeholder="Location (optional)"
        className={inputCls}
        data-testid="input-cal-location"
      />

      <button
        onClick={handleOpen}
        className="mt-0.5 w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg
          bg-primary/10 border border-primary/20 text-primary text-sm font-medium
          hover:bg-primary/15 transition-colors"
        data-testid="button-open-calendar"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Create in Calendar
      </button>
    </div>
  );
}
