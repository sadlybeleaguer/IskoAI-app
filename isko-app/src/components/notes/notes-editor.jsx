import { Clock3, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatNoteTimestamp, getNoteTitle } from "@/utils/notes"

export function NotesEditor({
  activeNote,
  draft,
  isDeleting,
  onDeleteNote,
  onDraftChange,
  saveState,
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3 border-b pb-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{getNoteTitle(activeNote)}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            {saveState === "saving"
              ? "Saving..."
              : saveState === "saved"
                ? "Saved"
                : `Edited ${formatNoteTimestamp(activeNote.updated_at)}`}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void onDeleteNote()}
          disabled={isDeleting}
        >
          <Trash2 data-icon="inline-start" />
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 py-5">
        <div className="grid gap-2">
          <label htmlFor="note-title" className="text-sm font-medium">
            Title
          </label>
          <Input
            id="note-title"
            value={draft.title}
            placeholder="Untitled note"
            onChange={(event) =>
              onDraftChange((currentDraft) => ({
                ...currentDraft,
                title: event.target.value,
              }))
            }
          />
        </div>

        <div className="grid min-h-0 flex-1 gap-2">
          <label htmlFor="note-body" className="text-sm font-medium">
            Note
          </label>
          <Textarea
            id="note-body"
            value={draft.content}
            placeholder="Start writing..."
            className="min-h-[20rem] flex-1 resize-none"
            onChange={(event) =>
              onDraftChange((currentDraft) => ({
                ...currentDraft,
                content: event.target.value,
              }))
            }
          />
        </div>
      </div>
    </div>
  )
}
