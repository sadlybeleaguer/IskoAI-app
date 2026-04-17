import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  archiveChatThread,
  createChatMessage,
  createChatThread,
  listChatMessages,
  listChatThreads,
  updateChatMessage,
  updateChatThreadAttachment,
  updateChatThreadTool,
} from "@/services/chat-service"
import { streamAssistantReply } from "@/services/ai-service"
import {
  defaultChatModels,
  listAvailableChatModels,
} from "@/services/models-service"
import { listNotes } from "@/services/notes-service"
import {
  getThreadTitle,
  groupThreads,
  sortThreads,
} from "@/utils/chat"
import { getErrorMessage } from "@/utils/errors"
import { getNoteTitle } from "@/utils/notes"

const assistantPersistDebounceMs = 180

function mergeStreamingAssistantMessages(serverMessages, localMessages) {
  const localStreamingAssistantMessages = localMessages.filter(
    (message) => message.role === "assistant" && message.isStreaming,
  )

  if (!localStreamingAssistantMessages.length) {
    return serverMessages
  }

  const streamingMessagesById = new Map(
    localStreamingAssistantMessages.map((message) => [message.id, message]),
  )
  const mergedMessages = serverMessages.map(
    (message) => streamingMessagesById.get(message.id) ?? message,
  )

  for (const message of localStreamingAssistantMessages) {
    if (!serverMessages.some((serverMessage) => serverMessage.id === message.id)) {
      mergedMessages.push(message)
    }
  }

  return mergedMessages
}

function isAbortError(error) {
  return error instanceof DOMException && error.name === "AbortError"
}

export function useChatWorkspace(userId, preferredThreadId = null) {
  const [threads, setThreads] = useState([])
  const [messages, setMessages] = useState([])
  const [activeThreadId, setActiveThreadId] = useState(null)
  const [draft, setDraft] = useState("")
  const [isLoadingThreads, setIsLoadingThreads] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [pageError, setPageError] = useState("")
  const [availableModels, setAvailableModels] = useState(defaultChatModels)
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const [modelsError, setModelsError] = useState("")
  const [selectedModelKey, setSelectedModelKey] = useState(defaultChatModels[0]?.key ?? "")
  const [selectedTool, setSelectedTool] = useState("")
  const [attachedNote, setAttachedNote] = useState(null)
  const [availableNotes, setAvailableNotes] = useState([])
  const [isLoadingAvailableNotes, setIsLoadingAvailableNotes] = useState(false)
  const [isNotePickerOpen, setIsNotePickerOpen] = useState(false)
  const [isUpdatingAttachedNote, setIsUpdatingAttachedNote] = useState(false)
  const [deletingThreadId, setDeletingThreadId] = useState("")
  const [composerNotice, setComposerNotice] = useState("")
  const [streamingThreadId, setStreamingThreadId] = useState("")
  const [streamingMessageId, setStreamingMessageId] = useState("")
  const endOfMessagesRef = useRef(null)
  const activeThreadIdRef = useRef(activeThreadId)
  const streamingThreadIdRef = useRef("")
  const streamAbortControllerRef = useRef(null)
  const attachmentUpdatePromiseRef = useRef(null)

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads],
  )
  const groupedThreads = useMemo(
    () => groupThreads(sortThreads(threads)),
    [threads],
  )
  const selectedModel = useMemo(
    () =>
      availableModels.find((model) => model.key === selectedModelKey) ??
      null,
    [availableModels, selectedModelKey],
  )
  const hasAvailableModels = availableModels.length > 0
  const isStreamingActiveThread =
    Boolean(streamingThreadId) && streamingThreadId === activeThreadId

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId
  }, [activeThreadId])

  useEffect(() => {
    streamingThreadIdRef.current = streamingThreadId
  }, [streamingThreadId])

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({
      behavior: isSending ? "auto" : "smooth",
      block: "end",
    })
  }, [isSending, messages])

  useEffect(() => {
    if (!userId) {
      setAvailableModels(defaultChatModels)
      setModelsError("")
      setSelectedModelKey(defaultChatModels[0]?.key ?? "")
      setIsLoadingModels(false)
      return
    }

    let isMounted = true

    const loadModels = async () => {
      setIsLoadingModels(true)

      try {
        const nextModels = await listAvailableChatModels()

        if (!isMounted) {
          return
        }

        setAvailableModels(nextModels)
        setModelsError("")
      } catch (error) {
        if (!isMounted) {
          return
        }

        setAvailableModels([])
        setModelsError(getErrorMessage(error, "Chat models are unavailable."))
      } finally {
        if (isMounted) {
          setIsLoadingModels(false)
        }
      }
    }

    void loadModels()

    return () => {
      isMounted = false
    }
  }, [userId])

  useEffect(() => {
    if (!availableModels.length) {
      setSelectedModelKey("")
      return
    }

    setSelectedModelKey((currentModelKey) =>
      currentModelKey &&
      availableModels.some((model) => model.key === currentModelKey)
        ? currentModelKey
        : availableModels[0].key,
    )
  }, [availableModels])

  useEffect(() => {
    setSelectedTool(activeThread?.selected_tool ?? "")
    setAttachedNote(
      activeThread?.attached_note_id
        ? {
            id: activeThread.attached_note_id,
            title: activeThread.attached_note_title || "Untitled note",
          }
        : null,
    )
  }, [activeThread])

  useEffect(() => {
    if (userId) {
      return
    }

    setAvailableNotes([])
    setIsLoadingAvailableNotes(false)
    setIsNotePickerOpen(false)
    setAttachedNote(null)
  }, [userId])

  const loadThreads = useCallback(async () => {
    if (!userId) {
      setThreads([])
      setActiveThreadId(null)
      setIsLoadingThreads(false)
      return
    }

    setIsLoadingThreads(true)
    setPageError("")

    try {
      const nextThreads = await listChatThreads(userId)
      setThreads(nextThreads)
      setActiveThreadId((currentThreadId) => {
        if (
          preferredThreadId &&
          nextThreads.some((thread) => thread.id === preferredThreadId)
        ) {
          return preferredThreadId
        }

        return currentThreadId &&
          nextThreads.some((thread) => thread.id === currentThreadId)
          ? currentThreadId
          : null
      })
    } catch (error) {
      setThreads([])
      setActiveThreadId(null)
      setPageError(getErrorMessage(error))
    } finally {
      setIsLoadingThreads(false)
    }
  }, [preferredThreadId, userId])

  useEffect(() => {
    void loadThreads()
  }, [loadThreads])

  useEffect(() => {
    if (
      !preferredThreadId ||
      activeThreadId === preferredThreadId ||
      !threads.some((thread) => thread.id === preferredThreadId)
    ) {
      return
    }

    setActiveThreadId(preferredThreadId)
    setComposerNotice("")
  }, [activeThreadId, preferredThreadId, threads])

  useEffect(() => {
    if (!activeThreadId || !userId) {
      setMessages([])
      setIsLoadingMessages(false)
      return undefined
    }

    let isMounted = true

    const loadMessages = async () => {
      setIsLoadingMessages(true)
      setPageError("")

      try {
        const nextMessages = await listChatMessages(userId, activeThreadId)

        if (isMounted) {
          setMessages((currentMessages) =>
            streamingThreadIdRef.current === activeThreadId
              ? mergeStreamingAssistantMessages(nextMessages, currentMessages)
              : nextMessages,
          )
        }
      } catch (error) {
        if (isMounted) {
          setMessages([])
          setPageError(getErrorMessage(error))
        }
      } finally {
        if (isMounted) {
          setIsLoadingMessages(false)
        }
      }
    }

    void loadMessages()

    return () => {
      isMounted = false
    }
  }, [activeThreadId, userId])

  useEffect(
    () => () => {
      streamAbortControllerRef.current?.abort()
    },
    [],
  )

  const upsertThreadState = useCallback((nextThread, nextUpdatedAt) => {
    setThreads((currentThreads) => {
      const threadExists = currentThreads.some((thread) => thread.id === nextThread.id)
      const mergedThreads = threadExists
        ? currentThreads.map((thread) =>
            thread.id === nextThread.id
              ? {
                  ...thread,
                  ...nextThread,
                  updated_at: nextUpdatedAt || nextThread.updated_at,
                }
              : thread,
          )
        : [
            {
              ...nextThread,
              updated_at: nextUpdatedAt || nextThread.updated_at,
            },
            ...currentThreads,
          ]

      return sortThreads(mergedThreads)
    })
  }, [])

  const updateLocalMessage = useCallback((threadId, messageId, updater) => {
    if (activeThreadIdRef.current !== threadId) {
      return
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              ...(typeof updater === "function" ? updater(message) : updater),
            }
          : message,
      ),
    )
  }, [])

  const replaceLocalMessage = useCallback((threadId, tempId, nextMessage) => {
    if (activeThreadIdRef.current !== threadId) {
      return
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === tempId
          ? {
              ...message,
              ...nextMessage,
            }
          : message,
      ),
    )
  }, [])

  const removeLocalMessage = useCallback((threadId, messageId) => {
    if (activeThreadIdRef.current !== threadId) {
      return
    }

    setMessages((currentMessages) =>
      currentMessages.filter((message) => message.id !== messageId),
    )
  }, [])

  const stopStreaming = useCallback(() => {
    streamAbortControllerRef.current?.abort()
  }, [])

  const loadAvailableNotes = useCallback(async () => {
    if (!userId) {
      setAvailableNotes([])
      return []
    }

    setIsLoadingAvailableNotes(true)

    try {
      const nextNotes = await listNotes(userId)
      setAvailableNotes(nextNotes)
      return nextNotes
    } catch (error) {
      setPageError(getErrorMessage(error))
      return []
    } finally {
      setIsLoadingAvailableNotes(false)
    }
  }, [userId])

  const flushPendingAttachmentUpdate = useCallback(async () => {
    const pendingUpdate = attachmentUpdatePromiseRef.current

    if (!pendingUpdate) {
      return
    }

    await pendingUpdate.catch(() => undefined)
  }, [])

  const createNewChat = () => {
    if (isSending) {
      stopStreaming()
    }

    setActiveThreadId(null)
    setMessages([])
    setDraft("")
    setAttachedNote(null)
    setComposerNotice("")
    setIsNotePickerOpen(false)
    setSelectedTool("")
  }

  const selectThread = (threadId) => {
    if (isSending) {
      stopStreaming()
    }

    setActiveThreadId(threadId)
    setComposerNotice("")
    setIsNotePickerOpen(false)
  }

  const deleteThread = useCallback(
    async (threadId) => {
      if (!threadId || !userId) {
        return
      }

      const isDeletingActiveThread = activeThreadIdRef.current === threadId

      if (isDeletingActiveThread && streamingThreadIdRef.current === threadId) {
        stopStreaming()
      }

      setDeletingThreadId(threadId)
      setPageError("")

      try {
        await archiveChatThread({
          threadId,
          userId,
        })

        setThreads((currentThreads) =>
          currentThreads.filter((thread) => thread.id !== threadId),
        )

        if (isDeletingActiveThread) {
          activeThreadIdRef.current = null
          setActiveThreadId(null)
          setMessages([])
          setAttachedNote(null)
          setComposerNotice("")
          setIsNotePickerOpen(false)
          setSelectedTool("")
        }
      } catch (error) {
        setPageError(getErrorMessage(error))
      } finally {
        setDeletingThreadId((currentThreadId) =>
          currentThreadId === threadId ? "" : currentThreadId,
        )
      }
    },
    [stopStreaming, userId],
  )

  const showComposerNotice = (message) => {
    setComposerNotice(message)
  }

  const handleSelectedToolChange = useCallback(
    async (nextTool) => {
      const previousTool = activeThread?.selected_tool ?? ""

      setSelectedTool(nextTool)
      setPageError("")

      if (!activeThreadId || !userId) {
        return
      }

      try {
        const updatedThread = await updateChatThreadTool({
          selectedTool: nextTool,
          threadId: activeThreadId,
          userId,
        })

        upsertThreadState(updatedThread)
      } catch (error) {
        setSelectedTool(previousTool)
        setPageError(getErrorMessage(error))
      }
    },
    [activeThread, activeThreadId, upsertThreadState, userId],
  )

  const openNotePicker = useCallback(() => {
    setIsNotePickerOpen(true)
    setComposerNotice("")
    void loadAvailableNotes()
  }, [loadAvailableNotes])

  const closeNotePicker = useCallback(() => {
    setIsNotePickerOpen(false)
  }, [])

  const handleAttachedNoteChange = useCallback(
    async (note) => {
      const nextAttachedNote = note
        ? {
            id: note.id,
            title: getNoteTitle(note),
          }
        : null
      const previousAttachedNote = attachedNote

      setAttachedNote(nextAttachedNote)
      setIsNotePickerOpen(false)
      setComposerNotice("")
      setPageError("")

      if (!activeThreadId || !userId) {
        return
      }

      setIsUpdatingAttachedNote(true)

      const persistPromise = updateChatThreadAttachment({
        attachedNoteId: nextAttachedNote?.id ?? null,
        threadId: activeThreadId,
        userId,
      })
        .then((updatedThread) => {
          upsertThreadState(updatedThread)
          setAttachedNote(
            updatedThread.attached_note_id
              ? {
                  id: updatedThread.attached_note_id,
                  title: updatedThread.attached_note_title || "Untitled note",
                }
              : null,
          )
          return updatedThread
        })
        .catch((error) => {
          setAttachedNote(previousAttachedNote)
          setPageError(getErrorMessage(error))
          throw error
        })
        .finally(() => {
          if (attachmentUpdatePromiseRef.current === persistPromise) {
            attachmentUpdatePromiseRef.current = null
          }

          setIsUpdatingAttachedNote(false)
        })

      attachmentUpdatePromiseRef.current = persistPromise
      await persistPromise
    },
    [activeThreadId, attachedNote, upsertThreadState, userId],
  )

  const sendMessage = async (event) => {
    event?.preventDefault?.()

    const content = draft.trim()

    if (!content || isSending || !userId || !selectedModelKey) {
      return
    }

    const abortController = new AbortController()
    let persistTimeoutId = null
    let persistInFlight = null
    let shouldPersistAgain = false
    let assistantRecord = null
    let assistantRecordId = ""
    let tempAssistantMessageId = ""
    let accumulatedAssistantContent = ""
    let lastPersistedAssistantContent = ""
    let streamThreadId = ""

    const clearPersistTimer = () => {
      if (!persistTimeoutId) {
        return
      }

      window.clearTimeout(persistTimeoutId)
      persistTimeoutId = null
    }

    const persistAssistantContent = async (threadId) => {
      if (!assistantRecordId || accumulatedAssistantContent === lastPersistedAssistantContent) {
        return
      }

      if (persistInFlight) {
        shouldPersistAgain = true
        return persistInFlight
      }

      persistInFlight = updateChatMessage({
        messageId: assistantRecordId,
        userId,
        content: accumulatedAssistantContent,
      })
        .then((updatedAssistantMessage) => {
          assistantRecord = updatedAssistantMessage
          assistantRecordId = updatedAssistantMessage.id
          lastPersistedAssistantContent = updatedAssistantMessage.content

          updateLocalMessage(threadId, updatedAssistantMessage.id, {
            ...updatedAssistantMessage,
            content: accumulatedAssistantContent,
            isStreaming: true,
          })
        })
        .catch((error) => {
          setPageError(getErrorMessage(error))
          throw error
        })
        .finally(async () => {
          persistInFlight = null

          if (shouldPersistAgain) {
            shouldPersistAgain = false
            await persistAssistantContent(threadId)
          }
        })

      return persistInFlight
    }

    const scheduleAssistantPersistence = (threadId) => {
      if (!assistantRecordId || persistTimeoutId) {
        return
      }

      persistTimeoutId = window.setTimeout(() => {
        persistTimeoutId = null
        void persistAssistantContent(threadId).catch(() => undefined)
      }, assistantPersistDebounceMs)
    }

    setIsSending(true)
    setPageError("")
    setDraft("")
    setComposerNotice("")

    try {
      await flushPendingAttachmentUpdate()

      let threadRecord = activeThread

      if (!threadRecord) {
        threadRecord = await createChatThread({
          attachedNoteId: attachedNote?.id ?? null,
          selectedTool,
          userId,
          title: getThreadTitle(content),
        })

        upsertThreadState(threadRecord)
        activeThreadIdRef.current = threadRecord.id
        setActiveThreadId(threadRecord.id)
        setMessages([])
      }

      streamThreadId = threadRecord.id
      const userMessage = await createChatMessage({
        threadId: streamThreadId,
        userId,
        role: "user",
        content,
      })

      if (activeThreadIdRef.current === streamThreadId || !activeThreadIdRef.current) {
        setMessages((currentMessages) => [...currentMessages, userMessage])
      }

      upsertThreadState(threadRecord, userMessage.created_at)

      tempAssistantMessageId = `temp-${crypto.randomUUID()}`
      const tempAssistantMessage = {
        id: tempAssistantMessageId,
        thread_id: streamThreadId,
        user_id: userId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
        isStreaming: true,
      }

      if (activeThreadIdRef.current === streamThreadId) {
        setMessages((currentMessages) => [...currentMessages, tempAssistantMessage])
      }

      streamAbortControllerRef.current = abortController
      streamingThreadIdRef.current = streamThreadId
      setStreamingThreadId(streamThreadId)
      setStreamingMessageId(tempAssistantMessageId)

      await streamAssistantReply(
        {
          threadId: streamThreadId,
          model: selectedModelKey,
          messages: [...messages, userMessage].map((message) => ({
            content: message.content,
            role: message.role,
          })),
          selectedTool,
        },
        {
          signal: abortController.signal,
          onEvent: async (streamEvent) => {
            if (streamEvent.type === "delta" && typeof streamEvent.delta === "string") {
              accumulatedAssistantContent += streamEvent.delta

              const localMessageId = assistantRecordId || tempAssistantMessageId
              updateLocalMessage(streamThreadId, localMessageId, {
                content: accumulatedAssistantContent,
                isStreaming: true,
              })

              if (!assistantRecord) {
                assistantRecord = await createChatMessage({
                  threadId: streamThreadId,
                  userId,
                  role: "assistant",
                  content: accumulatedAssistantContent,
                })
                assistantRecordId = assistantRecord.id
                lastPersistedAssistantContent = assistantRecord.content

                replaceLocalMessage(streamThreadId, tempAssistantMessageId, {
                  ...assistantRecord,
                  content: accumulatedAssistantContent,
                  isStreaming: true,
                })
                setStreamingMessageId(assistantRecord.id)
                upsertThreadState(threadRecord, assistantRecord.created_at)
                return
              }

              scheduleAssistantPersistence(streamThreadId)
            }
          },
        },
      )

      clearPersistTimer()
      await persistAssistantContent(streamThreadId)

      if (assistantRecordId) {
        updateLocalMessage(streamThreadId, assistantRecordId, {
          isStreaming: false,
        })
      } else {
        removeLocalMessage(streamThreadId, tempAssistantMessageId)
      }
    } catch (error) {
      clearPersistTimer()

      if (assistantRecordId) {
        await persistAssistantContent(streamThreadId)
        updateLocalMessage(
          streamThreadId,
          assistantRecordId,
          {
            isStreaming: false,
          },
        )
      } else if (tempAssistantMessageId) {
        removeLocalMessage(
          streamThreadId,
          tempAssistantMessageId,
        )
      }

      if (isAbortError(error)) {
        setComposerNotice("Generation stopped.")
      } else {
        setPageError(getErrorMessage(error))
      }
    } finally {
      clearPersistTimer()
      streamAbortControllerRef.current = null
      streamingThreadIdRef.current = ""
      setStreamingThreadId("")
      setStreamingMessageId("")
      setIsSending(false)
    }
  }

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void sendMessage(event)
    }
  }

  return {
    activeThread,
    activeThreadId,
    attachedNote,
    availableNotes,
    availableModels,
    closeNotePicker,
    composerNotice,
    createNewChat,
    deleteThread,
    deletingThreadId,
    draft,
    endOfMessagesRef,
    groupedThreads,
    handleComposerKeyDown,
    hasAvailableModels,
    isLoadingAvailableNotes,
    isLoadingMessages,
    isLoadingModels,
    isLoadingThreads,
    isNotePickerOpen,
    isSending,
    isStreamingActiveThread,
    isUpdatingAttachedNote,
    messages,
    modelsError,
    openNotePicker,
    pageError,
    selectedModelKey,
    selectedModelLabel: selectedModel?.label ?? "",
    selectedTool,
    setAttachedNote: handleAttachedNoteChange,
    selectThread,
    sendMessage,
    setComposerNotice: showComposerNotice,
    setDraft,
    setSelectedModelKey,
    setSelectedTool: handleSelectedToolChange,
    stopStreaming,
    streamingMessageId,
  }
}
