import { CalendarDays } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/utils/cn"
import { formatCompactDate } from "@/utils/calendar"

function CalendarSidebarSkeleton() {
  return (
    <div
      className="grid gap-2 px-3 py-2"
      role="status"
      aria-live="polite"
      aria-label="Loading events"
    >
      <span className="sr-only">Loading upcoming events...</span>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="grid gap-2 rounded-lg py-2">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      ))}
    </div>
  )
}

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
        <CalendarSidebarSkeleton />
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
