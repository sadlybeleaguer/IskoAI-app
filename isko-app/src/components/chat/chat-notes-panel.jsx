import { Plus, ChevronDown, FileText, Trash2, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useNotesWorkspace } from "@/hooks/use-notes-workspace"
import { NotesEditor } from "@/components/notes/notes-editor"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getNoteTitle, formatNoteTimestamp } from "@/utils/notes"
import { cn } from "@/utils/cn"

export function ChatNotesPanel() {
  const { user } = useAuth()
  const {
    activeNote,
    createNote,
    deleteNote,
    draft,
    isCreating,
    isDeleting,
    isLoading,
    notes,
    saveState,
    selectNote,
    setDraft,
  } = useNotesWorkspace(user?.id)

  return (
    <div className="flex h-full w-[400px] flex-col border-l bg-background/50 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-full justify-between px-2 text-left font-medium"
                disabled={isLoading}
              >
                <span className="truncate">
                  {isLoading ? "Loading..." : activeNote ? getNoteTitle(activeNote) : "No note selected"}
                </span>
                <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px]">
              <ScrollArea className="max-h-[300px]">
                {notes.map((note) => (
                  <DropdownMenuItem
                    key={note.id}
                    onSelect={() => selectNote(note.id)}
                    className={cn(activeNote?.id === note.id && "bg-muted")}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="truncate font-medium">{getNoteTitle(note)}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {formatNoteTimestamp(note.updated_at)}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </ScrollArea>
              {notes.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem onSelect={() => void createNote()} disabled={isCreating}>
                <Plus className="mr-2 size-4" />
                New note
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1 pl-2">
          {saveState === "saving" && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
          {saveState === "saved" && (
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Saved</span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void createNote()}
            disabled={isCreating}
            title="New note"
          >
            <Plus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => void deleteNote()}
            disabled={!activeNote || isDeleting}
            title="Delete note"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeNote ? (
          <div className="flex flex-1 flex-col px-4">
            <div className="mt-4 flex flex-col gap-2">
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Note title..."
                className="bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground/50"
              />
              <div className="h-px w-full bg-border/50" />
            </div>
            <NotesEditor
              draft={draft}
              onDraftChange={setDraft}
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
              <FileText className="size-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">No note selected</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Select an existing note from the menu or create a new one to start writing.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-6"
              onClick={() => void createNote()}
              disabled={isCreating}
            >
              <Plus className="mr-2 size-4" />
              Create your first note
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
