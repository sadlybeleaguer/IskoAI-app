import { CalendarDays } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"
import { formatCompactDate } from "@/utils/calendar"

export function CalendarSidebar({
  activeEventId,
  isLoading,
  onGoToToday,
  onSelectEvent,
  upcomingEvents,
}) {
  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="ghost"
        className="h-9 justify-start px-3"
        onClick={onGoToToday}
      >
        <CalendarDays data-icon="inline-start" />
        Today
      </Button>

      <div className="px-3 pt-1 text-xs text-muted-foreground">Upcoming</div>

      {isLoading ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">Loading events...</p>
      ) : null}

      {!isLoading && !upcomingEvents.length ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">
          No upcoming events in this calendar window.
        </p>
      ) : null}

      {upcomingEvents.map((event) => (
        <button
          key={event.id}
          type="button"
          className={cn(
            "flex w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left transition-colors",
            activeEventId === event.id
              ? "bg-background text-foreground"
              : "text-foreground hover:bg-muted",
          )}
          onClick={() => onSelectEvent(event)}
        >
          <span className="truncate text-sm font-medium">{event.title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {formatCompactDate(event.starts_at)}
          </span>
        </button>
      ))}
    </div>
  )
}
