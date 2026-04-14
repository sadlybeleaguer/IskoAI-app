import { Plus } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { NotesEditor } from "@/components/notes/notes-editor"
import { NotesEmptyState } from "@/components/notes/notes-empty-state"
import { NotesSidebar } from "@/components/notes/notes-sidebar"
import { WorkspaceShell } from "@/components/layout/workspace-shell"
import { useAuth } from "@/contexts/auth-context"
import { useNotesWorkspace } from "@/hooks/use-notes-workspace"
import { formatNoteTimestamp } from "@/utils/notes"

export function NotesPage() {
  const { user } = useAuth()
  const {
    activeNote,
    activeNoteId,
    createNote,
    deleteNote,
    draft,
    isCreating,
    isDeleting,
    isLoading,
    notes,
    pageError,
    saveState,
    selectNote,
    setDraft,
  } = useNotesWorkspace(user?.id)

  const alerts = pageError ? (
    <Alert variant="destructive">
      <AlertTitle>Notes unavailable</AlertTitle>
      <AlertDescription>{pageError}</AlertDescription>
    </Alert>
  ) : null

  return (
    <WorkspaceShell
      alerts={alerts}
      headerContent={
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">Notes</div>
          <div className="truncate text-xs text-muted-foreground">
            {activeNote
              ? `Updated ${formatNoteTimestamp(activeNote.updated_at)}`
              : "Plain text workspace notes"}
          </div>
        </div>
      }
      pageKey="notes"
      primaryAction={{
        label: isCreating ? "Creating..." : "New note",
        icon: Plus,
        onClick: () => void createNote(),
      }}
      sidebarContent={
        <NotesSidebar
          activeNoteId={activeNoteId}
          isLoading={isLoading}
          notes={notes}
          onSelectNote={selectNote}
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {activeNote ? (
          <NotesEditor
            activeNote={activeNote}
            draft={draft}
            isDeleting={isDeleting}
            onDeleteNote={deleteNote}
            onDraftChange={setDraft}
            saveState={saveState}
          />
        ) : (
          <NotesEmptyState onCreateNote={createNote} />
        )}
      </div>
    </WorkspaceShell>
  )
}
