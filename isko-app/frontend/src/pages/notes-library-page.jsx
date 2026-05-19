import { useEffect, useState } from "react"
import { ChevronRight, Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { NotesEmptyStateCard } from "@/components/notes/notes-empty-state"
import { WorkspaceShell } from "@/components/layout/workspace-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/context/auth-context"
import { createNote, listNotes } from "@/services/db.service"
import { getErrorMessage } from "@/utils/errors"
import {
  formatNoteTimestamp,
  getNotePreview,
  getNoteTitle,
} from "@/utils/notes"

function NotesLibraryCard({ note, onOpenNote }) {
  return (
    <button
      type="button"
      className="flex w-full items-start justify-between gap-4 rounded-lg border bg-background px-4 py-4 text-left transition-colors hover:bg-muted/40"
      onClick={() => onOpenNote(note.id)}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium tracking-[-0.01em]">
          {getNoteTitle(note)}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {formatNoteTimestamp(note.updated_at)}
        </div>
        <div className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {getNotePreview(note)}
        </div>
      </div>

      <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
    </button>
  )
}

function NotesLibrarySkeleton() {
  return (
    <div className="grid gap-3" role="status" aria-label="Loading notes">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-background px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="grid min-w-0 flex-1 gap-3">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-24" />
              <div className="grid gap-2 pt-1">
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-7/12" />
              </div>
            </div>
            <Skeleton className="size-4 shrink-0 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function NotesLibraryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notes, setNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [pageError, setPageError] = useState("")

  useEffect(() => {
    if (!user?.id) {
      setNotes([])
      setIsLoading(false)
      return
    }

    let isMounted = true

    const loadNotes = async () => {
      setIsLoading(true)
      setPageError("")

      try {
        const nextNotes = await listNotes(user.id)

        if (isMounted) {
          setNotes(nextNotes)
        }
      } catch (error) {
        if (isMounted) {
          setPageError(getErrorMessage(error))
          setNotes([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadNotes()

    return () => {
      isMounted = false
    }
  }, [user?.id])

  const handleCreateNote = async () => {
    if (!user?.id || isCreating) {
      return
    }

    setIsCreating(true)
    setPageError("")

    try {
      const nextNote = await createNote({ userId: user.id })
      navigate(`/notes/${nextNote.id}`)
    } catch (error) {
      setPageError(getErrorMessage(error))
    } finally {
      setIsCreating(false)
    }
  }

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
            <Skeleton className="mt-1 h-3 w-20" />
          ) : (
            <div className="truncate text-xs text-muted-foreground">
              {notes.length} notes
            </div>
          )}
        </div>
      }
      pageKey="notes"
      primaryAction={{
        label: isCreating ? "Creating..." : "New note",
        icon: Plus,
        onClick: () => void handleCreateNote(),
      }}
      sidebarContent={null}
    >
      <div className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.035),_transparent_52%)]">
        <div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-10">
          {isLoading ? (
            <NotesLibrarySkeleton />
          ) : notes.length ? (
            <div className="grid gap-3">
              {notes.map((note) => (
                <NotesLibraryCard
                  key={note.id}
                  note={note}
                  onOpenNote={(noteId) => navigate(`/notes/${noteId}`)}
                />
              ))}
            </div>
          ) : (
            <NotesEmptyStateCard
              title="No notes yet"
              description="Create a note to start a new document, then open it in the dedicated editor page."
              onCreateNote={handleCreateNote}
            />
          )}
        </div>
      </div>
    </WorkspaceShell>
  )
}
