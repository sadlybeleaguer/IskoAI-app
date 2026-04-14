import { Plus } from "lucide-react"

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
  } = useCalendarWorkspace(user?.id)

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
        onClick: () => createEventDraft(selectedDate),
      }}
      sidebarContent={
        <CalendarSidebar
          activeEventId={activeEventId}
          isLoading={isLoading}
          onGoToToday={() => {
            goToToday()
            createEventDraft(new Date())
          }}
          onSelectEvent={selectEvent}
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
            onGoToToday={goToToday}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <CalendarGrid
              currentMonth={currentMonth}
              events={events}
              monthDays={monthDays}
              onSelectDate={selectDate}
              selectedDate={selectedDate}
            />

            <CalendarDayPanel
              activeEventId={activeEventId}
              draft={draft}
              formError={formError}
              isDeleting={isDeleting}
              isSaving={isSaving}
              onCreateEvent={createEventDraft}
              onDeleteEvent={deleteEvent}
              onDraftChange={setDraft}
              onSaveEvent={saveEvent}
              onSelectEvent={selectEvent}
              selectedDate={selectedDate}
              selectedDayEvents={selectedDayEvents}
            />
          </div>
        </div>
      </ScrollArea>
    </WorkspaceShell>
  )
}
