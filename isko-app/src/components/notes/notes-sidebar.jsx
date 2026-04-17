import { cn } from "@/utils/cn"
import { formatNoteTimestamp, getNotePreview, getNoteTitle } from "@/utils/notes"

export function NotesSidebar({
  activeNoteId,
  isLoading,
  notes,
  onSelectNote,
}) {
  return (
    <div className="flex flex-col gap-2">
      {isLoading ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">Loading notes...</p>
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
