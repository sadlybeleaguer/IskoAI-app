import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  archiveNote,
  createNote,
  listNotes,
  updateNote,
} from "@/services/notes-service"
import { getErrorMessage } from "@/utils/errors"
import { getInitialNoteDraft, normalizeNoteContent } from "@/utils/notes"

const autosaveDelayMs = 300

export function useNotesWorkspace(userId, preferredNoteId = null) {
  const [notes, setNotes] = useState([])
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [draft, setDraft] = useState({ title: "", content: "" })
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pageError, setPageError] = useState("")
  const [saveState, setSaveState] = useState("idle")
  const saveTimeoutRef = useRef(null)
  const activeNoteRef = useRef(null)
  const draftRef = useRef(draft)
  const pendingSaveRef = useRef(null)
  const lastPersistedDraftRef = useRef({
    noteId: null,
    title: "",
    content: "",
  })

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) ?? null,
    [activeNoteId, notes],
  )

  useEffect(() => {
    activeNoteRef.current = activeNote
  }, [activeNote])

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  const persistDraft = useCallback(async ({ noteId, draftSnapshot, userId }) => {
    const fingerprint = `${noteId}::${draftSnapshot.title}\u0000${draftSnapshot.content}`

    if (pendingSaveRef.current?.fingerprint === fingerprint) {
      return pendingSaveRef.current.promise
    }

    const promise = updateNote({
      noteId,
      userId,
      title: draftSnapshot.title,
      content: draftSnapshot.content,
    })
      .then((updatedNote) => {
        const persistedSnapshot = {
          noteId: updatedNote.id,
          title: updatedNote.title ?? "",
          content: normalizeNoteContent(updatedNote.content),
        }

        lastPersistedDraftRef.current = persistedSnapshot
        setNotes((currentNotes) =>
          currentNotes
            .map((note) => (note.id === updatedNote.id ? updatedNote : note))
            .sort(
              (left, right) =>
                new Date(right.updated_at).valueOf() -
                new Date(left.updated_at).valueOf(),
            ),
        )

        return persistedSnapshot
      })
      .finally(() => {
        if (pendingSaveRef.current?.fingerprint === fingerprint) {
          pendingSaveRef.current = null
        }
      })

    pendingSaveRef.current = { fingerprint, promise }
    return promise
  }, [])

  const flushPendingSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    const currentNote = activeNoteRef.current
    const currentDraft = draftRef.current
    const persistedDraft = lastPersistedDraftRef.current

    if (!currentNote || !userId || persistedDraft.noteId !== currentNote.id) {
      return true
    }

    if (
      currentDraft.title === persistedDraft.title &&
      currentDraft.content === persistedDraft.content
    ) {
      return true
    }

    setSaveState("saving")
    setPageError("")

    try {
      const savedDraft = await persistDraft({
        noteId: currentNote.id,
        draftSnapshot: currentDraft,
        userId,
      })
      const latestDraft = draftRef.current

      setSaveState(
        latestDraft.title === savedDraft.title &&
          latestDraft.content === savedDraft.content
          ? "saved"
          : "saving",
      )

      return true
    } catch (error) {
      setSaveState("error")
      setPageError(getErrorMessage(error))
      return false
    }
  }, [persistDraft, userId])

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
          if (
            preferredNoteId &&
            nextNotes.some((note) => note.id === preferredNoteId)
          ) {
            return preferredNoteId
          }

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
  }, [preferredNoteId, userId])

  useEffect(() => {
    if (
      !preferredNoteId ||
      !notes.length ||
      activeNoteId === preferredNoteId ||
      !notes.some((note) => note.id === preferredNoteId)
    ) {
      return
    }

    setActiveNoteId(preferredNoteId)
  }, [activeNoteId, notes, preferredNoteId])

  useEffect(() => {
    const nextDraft = getInitialNoteDraft(activeNote)

    lastPersistedDraftRef.current = {
      noteId: activeNote?.id ?? null,
      title: nextDraft.title,
      content: nextDraft.content,
    }
    setDraft(nextDraft)
    setSaveState("idle")
  }, [activeNote?.id])

  useEffect(() => {
    if (!activeNote || !userId) {
      return undefined
    }
    const persistedDraft = lastPersistedDraftRef.current

    if (
      persistedDraft.noteId !== activeNote.id ||
      (draft.title === persistedDraft.title &&
        draft.content === persistedDraft.content)
    ) {
      return undefined
    }

    setSaveState("saving")
    const noteId = activeNote.id
    const draftSnapshot = draft

    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        setPageError("")

        const savedDraft = await persistDraft({
          noteId,
          draftSnapshot,
          userId,
        })
        const latestDraft = draftRef.current

        if (activeNoteRef.current?.id !== noteId) {
          return
        }

        setSaveState(
          latestDraft.title === savedDraft.title &&
            latestDraft.content === savedDraft.content
            ? "saved"
            : "saving",
        )
      } catch (error) {
        if (activeNoteRef.current?.id !== noteId) {
          return
        }

        setSaveState("error")
        setPageError(getErrorMessage(error))
      } finally {
        saveTimeoutRef.current = null
      }
    }, autosaveDelayMs)

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

    const hasSavedCurrentDraft = await flushPendingSave()

    if (!hasSavedCurrentDraft) {
      return
    }

    setIsCreating(true)
    setPageError("")

    try {
      const nextNote = await createNote({ userId })
      setNotes((currentNotes) => [nextNote, ...currentNotes])
      setActiveNoteId(nextNote.id)
      return nextNote
    } catch (error) {
      setPageError(getErrorMessage(error))
      return null
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteNote = async () => {
    if (!userId || !activeNote || isDeleting) {
      return
    }

    const hasSavedCurrentDraft = await flushPendingSave()

    if (!hasSavedCurrentDraft) {
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
      return remainingNotes[0]?.id ?? null
    } catch (error) {
      setPageError(getErrorMessage(error))
      return activeNote.id
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSelectNote = useCallback(
    async (noteId) => {
      if (!noteId || noteId === activeNoteRef.current?.id) {
        return
      }

      const hasSavedCurrentDraft = await flushPendingSave()

      if (!hasSavedCurrentDraft) {
        return
      }

      setActiveNoteId(noteId)
    },
    [flushPendingSave],
  )

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
    selectNote: handleSelectNote,
    setDraft,
    createNote: handleCreateNote,
    deleteNote: handleDeleteNote,
  }
}
