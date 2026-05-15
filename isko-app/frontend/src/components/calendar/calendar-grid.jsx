import { cn } from "@/utils/cn"
import {
  getEventsForDay,
  isSameDay,
  weekdayLabels,
} from "@/utils/calendar"

export function CalendarGrid({
  currentMonth,
  events,
  monthDays,
  onSelectDate,
  selectedDate,
}) {
  return (
    <section className="min-w-0">
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="bg-muted px-3 py-2 text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}

        {monthDays.map((date) => {
          const dayEvents = getEventsForDay(events, date)
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
          const isSelected = isSameDay(date, selectedDate)
          const isToday = isSameDay(date, new Date())

          return (
            <button
              key={date.toISOString()}
              type="button"
              className={cn(
                "flex min-h-32 flex-col gap-2 bg-background px-3 py-3 text-left transition-colors hover:bg-muted/60",
                !isCurrentMonth && "text-muted-foreground",
                isSelected && "bg-muted",
              )}
              onClick={() => onSelectDate(date, dayEvents[0]?.id ?? null)}
            >
              <div className="flex items-center justify-between gap-2">
                {isToday ? (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-sm font-medium">
                    {date.getDate()}
                  </div>
                ) : (
                  <span className="text-sm">
                    {date.getDate()}
                  </span>
                )}
                {dayEvents.length ? (
                  <span className="text-xs text-muted-foreground">
                    {dayEvents.length}
                  </span>
                ) : null}
              </div>

              <div className="grid gap-1">
                {dayEvents.slice(0, 2).map((event) => (
                  <span
                    key={event.id}
                    className="truncate rounded-md border px-2 py-1 text-xs"
                  >
                    {event.title}
                  </span>
                ))}
                {dayEvents.length > 2 ? (
                  <span className="text-xs text-muted-foreground">
                    +{dayEvents.length - 2} more
                  </span>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
