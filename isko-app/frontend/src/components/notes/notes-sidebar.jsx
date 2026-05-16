import { cn } from "@/utils/cn"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNoteTimestamp, getNotePreview, getNoteTitle } from "@/utils/notes"

function NotesSidebarSkeleton() {
  return (
    <div
      className="grid gap-2 px-3 py-2"
      role="status"
      aria-live="polite"
      aria-label="Loading notes"
    >
      <span className="sr-only">Loading notes library...</span>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid gap-2 rounded-lg py-2">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      ))}
    </div>
  )
}

export function NotesSidebar({
  activeNoteId,
  isLoading,
  notes,
  onSelectNote,
}) {
  return (
    <div className="flex flex-col gap-2">
      {isLoading ? (
        <NotesSidebarSkeleton />
      ) : null}

      {!isLoading && !notes.length ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">
          Create a note to start writing.
        </p>
      ) : null}

      {notes.map((note) => (
        <button
          key={note.id}
          type="button"
          className={cn(
            "flex w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left transition-colors",
            activeNoteId === note.id
              ? "bg-background text-foreground"
              : "text-foreground hover:bg-muted",
          )}
          onClick={() => onSelectNote(note.id)}
        >
          <span className="truncate text-sm font-medium">{getNoteTitle(note)}</span>
          <span className="max-h-10 overflow-hidden text-xs leading-5 text-muted-foreground">
            {getNotePreview(note)}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {formatNoteTimestamp(note.updated_at)}
          </span>
        </button>
      ))}
    </div>
  )
}
