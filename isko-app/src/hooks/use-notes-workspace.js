import { useEffect, useMemo, useRef, useState } from "react"

import {
  archiveNote,
  createNote,
  listNotes,
  updateNote,
} from "@/services/notes-service"
import { getErrorMessage } from "@/utils/errors"
import { getInitialNoteDraft } from "@/utils/notes"

export function useNotesWorkspace(userId) {
  const [notes, setNotes] = useState([])
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [draft, setDraft] = useState({ title: "", content: "" })
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pageError, setPageError] = useState("")
  const [saveState, setSaveState] = useState("idle")
  const saveTimeoutRef = useRef(null)
  const skipAutosaveRef = useRef(false)

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) ?? null,
    [activeNoteId, notes],
  )

  useEffect(() => {
    if (!userId) {
      setNotes([])
      setActiveNoteId(null)
      setIsLoading(false)
      return
    }

    let isMounted = true

    const loadNotes = async () => {
      setIsLoading(true)
      setPageError("")

      try {
        const nextNotes = await listNotes(userId)

        if (!isMounted) {
          return
        }

        setNotes(nextNotes)
        setActiveNoteId((currentNoteId) => {
          if (currentNoteId && nextNotes.some((note) => note.id === currentNoteId)) {
            return currentNoteId
          }

          return nextNotes[0]?.id ?? null
        })
      } catch (error) {
        if (!isMounted) {
          return
        }

        setPageError(getErrorMessage(error))
        setNotes([])
        setActiveNoteId(null)
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
  }, [userId])

  useEffect(() => {
    skipAutosaveRef.current = true
    setDraft(getInitialNoteDraft(activeNote))
    setSaveState("idle")
  }, [activeNote])

  useEffect(() => {
    if (!activeNote || !userId) {
      return undefined
    }

    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false
      return undefined
    }

    if (
      draft.title === activeNote.title &&
      draft.content === activeNote.content
    ) {
      return undefined
    }

    setSaveState("saving")

    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        const updatedNote = await updateNote({
          noteId: activeNote.id,
          userId,
          title: draft.title,
          content: draft.content,
        })

        setNotes((currentNotes) =>
          currentNotes
            .map((note) => (note.id === updatedNote.id ? updatedNote : note))
            .sort(
              (left, right) =>
                new Date(right.updated_at).valueOf() -
                new Date(left.updated_at).valueOf(),
            ),
        )
        setSaveState("saved")
      } catch (error) {
        setSaveState("error")
        setPageError(getErrorMessage(error))
      }
    }, 450)

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [activeNote, draft, userId])

  const handleCreateNote = async () => {
    if (!userId || isCreating) {
      return
    }

    setIsCreating(true)
    setPageError("")

    try {
      const nextNote = await createNote({ userId })
      setNotes((currentNotes) => [nextNote, ...currentNotes])
      setActiveNoteId(nextNote.id)
    } catch (error) {
      setPageError(getErrorMessage(error))
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteNote = async () => {
    if (!userId || !activeNote || isDeleting) {
      return
    }

    setIsDeleting(true)
    setPageError("")

    try {
      await archiveNote({
        noteId: activeNote.id,
        userId,
      })

      const remainingNotes = notes.filter((note) => note.id !== activeNote.id)
      setNotes(remainingNotes)
      setActiveNoteId(remainingNotes[0]?.id ?? null)
    } catch (error) {
      setPageError(getErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    activeNote,
    activeNoteId,
    draft,
    isCreating,
    isDeleting,
    isLoading,
    notes,
    pageError,
    saveState,
    selectNote: setActiveNoteId,
    setDraft,
    createNote: handleCreateNote,
    deleteNote: handleDeleteNote,
  }
}
