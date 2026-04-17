import { Check, FileText, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/utils/cn"
import { formatNoteTimestamp, getNotePreview, getNoteTitle } from "@/utils/notes"

export function ChatNotePicker({
  isLoading,
  notes,
  onClose,
  onSelectNote,
  open,
  selectedNoteId,
}) {
  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[65] flex items-start justify-center bg-black/45 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-background shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">Attach note</div>
            <div className="truncate text-xs text-muted-foreground">
              One note stays attached to this thread until you remove it.
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close note picker"
          >
            <X className="size-4" />
          </Button>
        </div>

        <ScrollArea className="max-h-[min(30rem,calc(100vh-10rem))]">
          <div className="flex flex-col gap-2 p-3">
            {isLoading ? (
              <div className="px-2 py-10 text-sm text-muted-foreground">
                Loading notes...
              </div>
            ) : !notes.length ? (
              <div className="px-2 py-10 text-sm text-muted-foreground">
                No notes available to attach.
              </div>
            ) : (
              notes.map((note) => {
                const isSelected = note.id === selectedNoteId

                return (
                  <button
                    key={note.id}
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                      isSelected ? "border-foreground/20 bg-muted" : "hover:bg-muted/60",
                    )}
                    onClick={() => void onSelectNote(note)}
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
                      {isSelected ? (
                        <Check className="size-4" />
                      ) : (
                        <FileText className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium">
                          {getNoteTitle(note)}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatNoteTimestamp(note.updated_at)}
                        </span>
                      </span>
                      <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                        {getNotePreview(note)}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
