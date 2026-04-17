import { useEffect, useRef } from "react"
import { Plus } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { NotesHeader } from "@/components/notes/notes-header"
import { NotesEditor } from "@/components/notes/notes-editor"
import { NotesEmptyState } from "@/components/notes/notes-empty-state"
import { WorkspaceShell } from "@/components/layout/workspace-shell"
import { useAuth } from "@/contexts/auth-context"
import { useNotesWorkspace } from "@/hooks/use-notes-workspace"
import { formatNoteTimestamp } from "@/utils/notes"

export function NotesEditorPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { noteId } = useParams()
  const editorRef = useRef(null)
  const {
    activeNote,
    createNote,
    deleteNote,
    draft,
    isCreating,
    isDeleting,
    isLoading,
    notes,
    pageError,
    saveState,
    setDraft,
  } = useNotesWorkspace(user?.id, noteId ?? null)

  const noteExists = !noteId || notes.some((note) => note.id === noteId)

  useEffect(() => {
    if (!isLoading && noteId && !noteExists) {
      navigate("/notes", { replace: true })
    }
  }, [isLoading, navigate, noteExists, noteId])

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
              : "Rich text workspace notes"}
          </div>
        </div>
      }
      pageKey="notes"
      primaryAction={{
        label: isCreating ? "Creating..." : "New note",
        icon: Plus,
        onClick: async () => {
          const nextNote = await createNote()

          if (nextNote?.id) {
            navigate(`/notes/${nextNote.id}`)
          }
        },
      }}
      sidebarContent={null}
    >
      <div className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.035),_transparent_52%)]">
        {activeNote ? (
          <div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-10">
            <div className="border-b border-border/70 bg-background/90 pb-5 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <NotesHeader
                activeNote={activeNote}
                draft={draft}
                editorRef={editorRef}
                isDeleting={isDeleting}
                onDeleteNote={async () => {
                  const nextNoteId = await deleteNote()

                  if (nextNoteId) {
                    navigate(`/notes/${nextNoteId}`)
                  } else {
                    navigate("/notes")
                  }
                }}
                onTitleChange={(title) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    title,
                  }))
                }
                saveState={saveState}
              />
            </div>

            <NotesEditor
              draft={draft}
              editorRef={editorRef}
              onDraftChange={setDraft}
            />
          </div>
        ) : (
          <NotesEmptyState
            onCreateNote={async () => {
              const nextNote = await createNote()

              if (nextNote?.id) {
                navigate(`/notes/${nextNote.id}`)
              }
            }}
          />
        )}
      </div>
    </WorkspaceShell>
  )
}
