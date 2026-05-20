import { useEffect, useRef, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { NotesHeader } from "@/components/notes/notes-header"
import { NotesEditor } from "@/components/notes/notes-editor"
import { NotesEmptyState } from "@/components/notes/notes-empty-state"
import { WorkspaceShell } from "@/components/layout/workspace-shell"
import { ActionConfirmDialog } from "@/components/ui/action-confirm-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/context/auth-context"
import { useNotesWorkspace } from "@/hooks/use-notes-workspace"
import { formatNoteTimestamp } from "@/utils/notes"

function NotesEditorSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-10" role="status" aria-label="Loading note">
      <div className="border-b border-border/70 bg-background/90 pb-5 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="grid min-w-0 flex-1 gap-2">
              <Skeleton className="h-7 w-2/5" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-36 rounded-lg" />
            <Skeleton className="h-9 w-56 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 py-6">
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-10/12" />
        <Skeleton className="h-4 w-8/12" />
        <Skeleton className="mt-4 h-4 w-9/12" />
        <Skeleton className="h-4 w-7/12" />
        <Skeleton className="mt-4 h-24 w-full rounded-lg" />
      </div>
    </div>
  )
}

export function NotesEditorPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { noteId } = useParams()
  const editorRef = useRef(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
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
          {isLoading ? (
            <Skeleton className="mt-1 h-3 w-32" />
          ) : (
            <div className="truncate text-xs text-muted-foreground">
              {activeNote
                ? `Updated ${formatNoteTimestamp(activeNote.updated_at)}`
                : "Rich text workspace notes"}
            </div>
          )}
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
        {isLoading ? (
          <NotesEditorSkeleton />
        ) : activeNote ? (
          <div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-10">
            <div className="border-b border-border/70 bg-background/90 pb-5 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <NotesHeader
                activeNote={activeNote}
                draft={draft}
                editorRef={editorRef}
                isDeleting={isDeleting}
                onDeleteNote={() => setIsDeleteDialogOpen(true)}
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
      <ActionConfirmDialog
        confirmLabel="Delete"
        description="This note will be permanently deleted."
        icon={Trash2}
        isSubmitting={isDeleting}
        onConfirm={async () => {
          const result = await deleteNote()

          if (!result?.deleted) {
            return
          }

          setIsDeleteDialogOpen(false)

          if (result.nextNoteId) {
            navigate(`/notes/${result.nextNoteId}`)
          } else {
            navigate("/notes")
          }
        }}
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
        title="Delete note?"
        tone="destructive"
      />
    </WorkspaceShell>
  )
}
