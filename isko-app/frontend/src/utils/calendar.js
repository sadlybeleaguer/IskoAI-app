export const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function startOfMonth(value) {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

export function endOfMonth(value) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0)
}

export function startOfDay(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

export function addDays(value, days) {
  const nextDate = new Date(value)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

export function getGridRange(value) {
  const monthStart = startOfMonth(value)
  const monthEnd = endOfMonth(value)
  const gridStart = addDays(monthStart, -monthStart.getDay())
  const gridEnd = addDays(monthEnd, 6 - monthEnd.getDay())

  return { gridStart, gridEnd }
}

export function getMonthDays(value) {
  const { gridStart } = getGridRange(value)

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
}

export function isSameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

export function formatMonthLabel(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(value)
}

export function formatDayLabel(value) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(value)
}

export function formatCompactDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

export function formatTimeRange(event) {
  if (event.is_all_day) {
    return "All day"
  }

  const formatTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })

  return `${formatTime.format(new Date(event.starts_at))} - ${formatTime.format(new Date(event.ends_at))}`
}

export function toDateTimeLocalValue(value) {
  const date = new Date(value)
  const pad = (number) => String(number).padStart(2, "0")

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function getNewEventDraft(selectedDate) {
  const start = new Date(selectedDate)
  start.setHours(9, 0, 0, 0)
  const end = new Date(selectedDate)
  end.setHours(10, 0, 0, 0)

  return {
    title: "",
    description: "",
    startsAt: toDateTimeLocalValue(start),
    endsAt: toDateTimeLocalValue(end),
    isAllDay: false,
  }
}

export function getEventDraft(event, selectedDate) {
  if (!event) {
    return getNewEventDraft(selectedDate)
  }

  return {
    title: event.title,
    description: event.description ?? "",
    startsAt: toDateTimeLocalValue(event.starts_at),
    endsAt: toDateTimeLocalValue(event.ends_at),
    isAllDay: event.is_all_day,
  }
}

export function getEventsForDay(events, date) {
  return events.filter((event) => {
    const startsAt = new Date(event.starts_at)
    const endsAt = new Date(event.ends_at)
    const targetDay = startOfDay(date)
    const dayEnd = addDays(targetDay, 1)

    return startsAt < dayEnd && endsAt >= targetDay
  })
}
