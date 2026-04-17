import { Plus } from "lucide-react"
import { useSearchParams } from "react-router-dom"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CalendarDayPanel } from "@/components/calendar/calendar-day-panel"
import { CalendarGrid } from "@/components/calendar/calendar-grid"
import { CalendarSidebar } from "@/components/calendar/calendar-sidebar"
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar"
import { WorkspaceShell } from "@/components/layout/workspace-shell"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/auth-context"
import { useCalendarWorkspace } from "@/hooks/use-calendar-workspace"

export function CalendarPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const preferredDateValue = searchParams.get("date")
  const preferredEventId = searchParams.get("eventId")
  const {
    activeEventId,
    createEventDraft,
    currentMonth,
    currentMonthLabel,
    draft,
    events,
    formError,
    goToNextMonth,
    goToPreviousMonth,
    goToToday,
    isDeleting,
    isLoading,
    isSaving,
    monthDays,
    pageError,
    saveEvent,
    selectDate,
    selectEvent,
    selectedDate,
    selectedDayEvents,
    setDraft,
    upcomingEvents,
    deleteEvent,
  } = useCalendarWorkspace(user?.id, {
    preferredDateValue,
    preferredEventId,
  })

  const updateSearchParams = (date, eventId = "") => {
    const nextSearchParams = new URLSearchParams(searchParams)

    if (date) {
      nextSearchParams.set("date", date.toISOString())
    } else {
      nextSearchParams.delete("date")
    }

    if (eventId) {
      nextSearchParams.set("eventId", eventId)
    } else {
      nextSearchParams.delete("eventId")
    }

    setSearchParams(nextSearchParams, { replace: true })
  }

  const handleSelectDate = (date, nextActiveEventId = null) => {
    updateSearchParams(date, nextActiveEventId ?? "")
    selectDate(date, nextActiveEventId)
  }

  const handleSelectEvent = (event) => {
    const eventDate = new Date(event.starts_at)
    updateSearchParams(eventDate, event.id)
    selectEvent(event)
  }

  const handleGoToToday = () => {
    const today = new Date()
    updateSearchParams(today)
    goToToday()
  }

  const handleCreateEventDraft = (date = selectedDate) => {
    updateSearchParams(date)
    createEventDraft(date)
  }

  const alerts = pageError ? (
    <Alert variant="destructive">
      <AlertTitle>Calendar unavailable</AlertTitle>
      <AlertDescription>{pageError}</AlertDescription>
    </Alert>
  ) : null

  return (
    <WorkspaceShell
      alerts={alerts}
      headerContent={
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">Calendar</div>
          <div className="truncate text-xs text-muted-foreground">
            {currentMonthLabel}
          </div>
        </div>
      }
      pageKey="calendar"
      primaryAction={{
        label: "New event",
        icon: Plus,
        onClick: () => handleCreateEventDraft(selectedDate),
      }}
      sidebarContent={
        <CalendarSidebar
          activeEventId={activeEventId}
          isLoading={isLoading}
          onGoToToday={() => {
            const today = new Date()
            updateSearchParams(today)
            goToToday()
            createEventDraft(today)
          }}
          onSelectEvent={handleSelectEvent}
          upcomingEvents={upcomingEvents}
        />
      }
    >
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <CalendarToolbar
            currentMonthLabel={currentMonthLabel}
            onGoToNextMonth={goToNextMonth}
            onGoToPreviousMonth={goToPreviousMonth}
            onGoToToday={handleGoToToday}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <CalendarGrid
              currentMonth={currentMonth}
              events={events}
              monthDays={monthDays}
              onSelectDate={handleSelectDate}
              selectedDate={selectedDate}
            />

            <CalendarDayPanel
              activeEventId={activeEventId}
              draft={draft}
              formError={formError}
              isDeleting={isDeleting}
              isSaving={isSaving}
              onCreateEvent={handleCreateEventDraft}
              onDeleteEvent={deleteEvent}
              onDraftChange={setDraft}
              onSaveEvent={saveEvent}
              onSelectEvent={handleSelectEvent}
              selectedDate={selectedDate}
              selectedDayEvents={selectedDayEvents}
            />
          </div>
        </div>
      </ScrollArea>
    </WorkspaceShell>
  )
}
