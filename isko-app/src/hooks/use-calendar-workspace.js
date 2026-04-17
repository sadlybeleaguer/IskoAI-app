import { useEffect, useMemo, useState } from "react"

import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
} from "@/services/calendar-service"
import {
  formatMonthLabel,
  getEventDraft,
  getEventsForDay,
  getGridRange,
  getMonthDays,
  getNewEventDraft,
  isSameDay,
  startOfDay,
  startOfMonth,
} from "@/utils/calendar"
import { getErrorMessage } from "@/utils/errors"

function getValidDate(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? null : date
}

function isSameMonth(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth()
  )
}

export function useCalendarWorkspace(
  userId,
  { preferredDateValue = null, preferredEventId = null } = {},
) {
  const preferredDate = useMemo(
    () => getValidDate(preferredDateValue),
    [preferredDateValue],
  )
  const initialDate = preferredDate ?? new Date()
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(initialDate))
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(initialDate))
  const [events, setEvents] = useState([])
  const [activeEventId, setActiveEventId] = useState(null)
  const [draft, setDraft] = useState(() => getNewEventDraft(initialDate))
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pageError, setPageError] = useState("")
  const [formError, setFormError] = useState("")

  const monthDays = useMemo(() => getMonthDays(currentMonth), [currentMonth])
  const { gridStart, gridEnd } = useMemo(() => getGridRange(currentMonth), [currentMonth])

  useEffect(() => {
    if (!userId) {
      setEvents([])
      setIsLoading(false)
      return
    }

    let isMounted = true

    const loadEvents = async () => {
      setIsLoading(true)
      setPageError("")

      try {
        const nextEvents = await listCalendarEvents({
          userId,
          rangeStart: gridStart.toISOString(),
          rangeEnd: gridEnd.toISOString(),
        })

        if (isMounted) {
          setEvents(nextEvents)
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        setPageError(getErrorMessage(error))
        setEvents([])
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadEvents()

    return () => {
      isMounted = false
    }
  }, [gridEnd, gridStart, userId])

  const activeEvent = useMemo(
    () => events.find((event) => event.id === activeEventId) ?? null,
    [activeEventId, events],
  )

  const selectedDayEvents = useMemo(
    () =>
      getEventsForDay(events, selectedDate).sort(
        (left, right) =>
          new Date(left.starts_at).valueOf() - new Date(right.starts_at).valueOf(),
      ),
    [events, selectedDate],
  )

  const upcomingEvents = useMemo(
    () =>
      [...events]
        .filter((event) => new Date(event.ends_at).valueOf() >= Date.now())
        .sort(
          (left, right) =>
            new Date(left.starts_at).valueOf() - new Date(right.starts_at).valueOf(),
        )
        .slice(0, 8),
    [events],
  )

  useEffect(() => {
    if (!preferredDate) {
      return
    }

    const nextSelectedDate = startOfDay(preferredDate)
    const nextMonth = startOfMonth(preferredDate)

    setSelectedDate((currentDate) =>
      isSameDay(currentDate, nextSelectedDate) ? currentDate : nextSelectedDate,
    )
    setCurrentMonth((currentMonthValue) =>
      isSameMonth(currentMonthValue, nextMonth) ? currentMonthValue : nextMonth,
    )
  }, [preferredDate])

  useEffect(() => {
    if (!preferredEventId) {
      return
    }

    const preferredEvent = events.find((event) => event.id === preferredEventId)

    if (!preferredEvent || activeEventId === preferredEventId) {
      return
    }

    setActiveEventId(preferredEventId)
    setSelectedDate(startOfDay(new Date(preferredEvent.starts_at)))
  }, [activeEventId, events, preferredEventId])

  useEffect(() => {
    setDraft(getEventDraft(activeEvent, selectedDate))
    setFormError("")
  }, [activeEvent, selectedDate])

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(startOfMonth(today))
    setSelectedDate(startOfDay(today))
  }

  const goToPreviousMonth = () => {
    setCurrentMonth((currentValue) =>
      startOfMonth(
        new Date(currentValue.getFullYear(), currentValue.getMonth() - 1, 1),
      ),
    )
  }

  const goToNextMonth = () => {
    setCurrentMonth((currentValue) =>
      startOfMonth(
        new Date(currentValue.getFullYear(), currentValue.getMonth() + 1, 1),
      ),
    )
  }

  const handleStartNewEvent = (date = selectedDate) => {
    const normalizedDate = startOfDay(date)
    setSelectedDate(normalizedDate)
    setActiveEventId(null)
    setDraft(getNewEventDraft(date))
    setFormError("")
  }

  const handleSelectDate = (date, nextActiveEventId = null) => {
    setSelectedDate(startOfDay(date))
    setActiveEventId(nextActiveEventId)
  }

  const handleSelectEvent = (event) => {
    setSelectedDate(startOfDay(new Date(event.starts_at)))
    setActiveEventId(event.id)
    setFormError("")
  }

  const handleSave = async (submitEvent) => {
    submitEvent.preventDefault()

    if (!userId || isSaving) {
      return
    }

    const normalizedTitle = draft.title.trim()

    if (!normalizedTitle) {
      setFormError("Event title is required.")
      return
    }

    if (!draft.startsAt || !draft.endsAt) {
      setFormError("Start and end times are required.")
      return
    }

    const startsAt = new Date(draft.startsAt)
    const endsAt = new Date(draft.endsAt)

    if (Number.isNaN(startsAt.valueOf()) || Number.isNaN(endsAt.valueOf())) {
      setFormError("Enter valid start and end times.")
      return
    }

    if (endsAt.valueOf() < startsAt.valueOf()) {
      setFormError("End time must be after the start time.")
      return
    }

    setIsSaving(true)
    setPageError("")
    setFormError("")

    try {
      const payload = {
        userId,
        title: normalizedTitle,
        description: draft.description.trim(),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        isAllDay: draft.isAllDay,
      }

      const savedEvent = activeEventId
        ? await updateCalendarEvent({
            ...payload,
            eventId: activeEventId,
          })
        : await createCalendarEvent(payload)

      setEvents((currentEvents) => {
        const alreadyExists = currentEvents.some((event) => event.id === savedEvent.id)
        const nextEvents = alreadyExists
          ? currentEvents.map((event) =>
              event.id === savedEvent.id ? savedEvent : event,
            )
          : [...currentEvents, savedEvent]

        return nextEvents.sort(
          (left, right) =>
            new Date(left.starts_at).valueOf() - new Date(right.starts_at).valueOf(),
        )
      })
      setActiveEventId(savedEvent.id)
      setSelectedDate(startOfDay(new Date(savedEvent.starts_at)))
    } catch (error) {
      setPageError(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!userId || !activeEvent || isDeleting) {
      return
    }

    setIsDeleting(true)
    setPageError("")

    try {
      await deleteCalendarEvent({
        eventId: activeEvent.id,
        userId,
      })

      setEvents((currentEvents) =>
        currentEvents.filter((event) => event.id !== activeEvent.id),
      )
      setActiveEventId(null)
      setDraft(getNewEventDraft(selectedDate))
    } catch (error) {
      setPageError(getErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    activeEvent,
    activeEventId,
    currentMonth,
    currentMonthLabel: formatMonthLabel(currentMonth),
    draft,
    events,
    formError,
    gridEnd,
    gridStart,
    isDeleting,
    isLoading,
    isSaving,
    monthDays,
    pageError,
    selectedDate,
    selectedDayEvents,
    upcomingEvents,
    createEventDraft: handleStartNewEvent,
    deleteEvent: handleDelete,
    goToNextMonth,
    goToPreviousMonth,
    goToToday,
    saveEvent: handleSave,
    selectDate: handleSelectDate,
    selectEvent: handleSelectEvent,
    setDraft,
    setSelectedDate,
    setCurrentMonth,
  }
}
