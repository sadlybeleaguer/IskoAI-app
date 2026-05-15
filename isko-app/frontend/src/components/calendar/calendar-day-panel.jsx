import { Clock3, Plus, Trash2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/utils/cn"
import { formatDayLabel, formatTimeRange } from "@/utils/calendar"

export function CalendarDayPanel({
  activeEventId,
  draft,
  formError,
  isDeleting,
  isSaving,
  onCreateEvent,
  onDeleteEvent,
  onDraftChange,
  onSaveEvent,
  onSelectEvent,
  selectedDate,
  selectedDayEvents,
}) {
  return (
    <aside className="min-w-0 rounded-lg border bg-card">
      <div className="border-b px-4 py-4">
        <div className="text-sm font-medium">{formatDayLabel(selectedDate)}</div>
        <div className="text-xs text-muted-foreground">
          {selectedDayEvents.length
            ? `${selectedDayEvents.length} event${selectedDayEvents.length === 1 ? "" : "s"}`
            : "No events scheduled"}
        </div>
      </div>

      <div className="grid gap-4 px-4 py-4">
        <div className="grid gap-2">
          {selectedDayEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted",
                activeEventId === event.id && "bg-muted",
              )}
              onClick={() => onSelectEvent(event)}
            >
              <div className="truncate text-sm font-medium">{event.title}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" />
                {formatTimeRange(event)}
              </div>
            </button>
          ))}

          {!selectedDayEvents.length ? (
            <p className="text-sm text-muted-foreground">
              Select a day in the grid or create a new event for this date.
            </p>
          ) : null}

          <Button type="button" variant="outline" onClick={() => onCreateEvent(selectedDate)}>
            <Plus data-icon="inline-start" />
            New event
          </Button>
        </div>

        <form className="grid gap-3 border-t pt-4" onSubmit={onSaveEvent}>
          <div className="grid gap-2">
            <label htmlFor="calendar-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="calendar-title"
              value={draft.title}
              placeholder="Team sync"
              onChange={(event) =>
                onDraftChange((currentDraft) => ({
                  ...currentDraft,
                  title: event.target.value,
                }))
              }
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="calendar-starts-at" className="text-sm font-medium">
              Starts
            </label>
            <Input
              id="calendar-starts-at"
              type="datetime-local"
              value={draft.startsAt}
              onChange={(event) =>
                onDraftChange((currentDraft) => ({
                  ...currentDraft,
                  startsAt: event.target.value,
                }))
              }
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="calendar-ends-at" className="text-sm font-medium">
              Ends
            </label>
            <Input
              id="calendar-ends-at"
              type="datetime-local"
              value={draft.endsAt}
              onChange={(event) =>
                onDraftChange((currentDraft) => ({
                  ...currentDraft,
                  endsAt: event.target.value,
                }))
              }
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.isAllDay}
              onChange={(event) =>
                onDraftChange((currentDraft) => ({
                  ...currentDraft,
                  isAllDay: event.target.checked,
                }))
              }
            />
            All day
          </label>

          <div className="grid gap-2">
            <label htmlFor="calendar-description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="calendar-description"
              value={draft.description}
              placeholder="Optional notes"
              className="min-h-28 resize-none"
              onChange={(event) =>
                onDraftChange((currentDraft) => ({
                  ...currentDraft,
                  description: event.target.value,
                }))
              }
            />
          </div>

          {formError ? (
            <Alert variant="destructive">
              <AlertTitle>Event validation failed</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : activeEventId ? "Save changes" : "Create event"}
            </Button>
            {activeEventId ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void onDeleteEvent()}
                disabled={isDeleting}
              >
                <Trash2 data-icon="inline-start" />
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </aside>
  )
}
