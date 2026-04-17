import { listCalendarEvents } from "@/services/calendar-service"
import { listChatThreads } from "@/services/chat-service"
import { listNotes } from "@/services/notes-service"
import { formatCompactDate } from "@/utils/calendar"
import { formatRelativeTime } from "@/utils/chat"
import { getNotePreview, getNoteTitle } from "@/utils/notes"

const calendarSearchWindowInMonths = 12

function getCalendarSearchWindow(now = new Date()) {
  const rangeStart = new Date(
    now.getFullYear(),
    now.getMonth() - calendarSearchWindowInMonths,
    1,
    0,
    0,
    0,
    0,
  )
  const rangeEnd = new Date(
    now.getFullYear(),
    now.getMonth() + calendarSearchWindowInMonths + 1,
    0,
    23,
    59,
    59,
    999,
  )

  return {
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
  }
}

function buildHref(pathname, searchParams) {
  const query = new URLSearchParams(searchParams).toString()
  return query ? `${pathname}?${query}` : pathname
}

function toDateValue(value) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? 0 : date.valueOf()
}

function createNoteRecord(note) {
  const title = getNoteTitle(note)
  const preview = getNotePreview(note)

  return {
    type: "note",
    id: note.id,
    title,
    subtitle: preview,
    href: `/notes/${note.id}`,
    updatedAt: note.updated_at,
    meta: formatRelativeTime(note.updated_at),
    searchValue: `${title} ${preview}`.trim(),
    sortValue: toDateValue(note.updated_at),
  }
}

function createChatRecord(thread) {
  const title = thread.title?.trim() || "Untitled chat"

  return {
    type: "chat",
    id: thread.id,
    title,
    subtitle: thread.selected_tool?.trim()
      ? `Tool: ${thread.selected_tool.trim()}`
      : "Chat thread",
    href: buildHref("/chat", { threadId: thread.id }),
    updatedAt: thread.updated_at,
    meta: formatRelativeTime(thread.updated_at),
    searchValue: title,
    sortValue: toDateValue(thread.updated_at),
  }
}

function createCalendarRecord(event) {
  const title = event.title?.trim() || "Untitled event"
  const description = event.description?.trim() ?? ""

  return {
    type: "calendar",
    id: event.id,
    title,
    subtitle: description
      ? `${formatCompactDate(event.starts_at)} - ${description}`
      : formatCompactDate(event.starts_at),
    href: buildHref("/calendar", {
      date: event.starts_at,
      eventId: event.id,
    }),
    updatedAt: event.updated_at || event.starts_at,
    meta: formatCompactDate(event.starts_at),
    searchValue: `${title} ${description}`.trim(),
    sortValue: Math.max(
      toDateValue(event.updated_at),
      toDateValue(event.starts_at),
    ),
  }
}

export async function loadWorkspaceSearchRecords(userId) {
  const { rangeStart, rangeEnd } = getCalendarSearchWindow()
  const requests = [
    {
      key: "note",
      label: "Notes",
      load: () => listNotes(userId),
    },
    {
      key: "chat",
      label: "Chat",
      load: () => listChatThreads(userId),
    },
    {
      key: "calendar",
      label: "Calendar",
      load: () =>
        listCalendarEvents({
          userId,
          rangeStart,
          rangeEnd,
        }),
    },
  ]

  const settledResults = await Promise.allSettled(
    requests.map((request) => request.load()),
  )

  const records = []
  const errors = []

  settledResults.forEach((result, index) => {
    const request = requests[index]

    if (result.status === "rejected") {
      errors.push({
        key: request.key,
        label: request.label,
        message:
          result.reason instanceof Error
            ? result.reason.message
            : "Unable to load results.",
      })
      return
    }

    const nextRecords =
      request.key === "note"
        ? result.value.map(createNoteRecord)
        : request.key === "chat"
          ? result.value.map(createChatRecord)
          : result.value.map(createCalendarRecord)

    records.push(...nextRecords)
  })

  return {
    errors,
    records,
  }
}
