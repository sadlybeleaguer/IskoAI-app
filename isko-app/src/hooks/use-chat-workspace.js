import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  createChatMessage,
  createChatThread,
  listChatMessages,
  listChatThreads,
} from "@/services/chat-service"
import {
  defaultChatModels,
  listAvailableChatModels,
} from "@/services/models-service"
import {
  buildReply,
  delay,
  getThreadTitle,
  groupThreads,
  sortThreads,
} from "@/utils/chat"
import { getErrorMessage } from "@/utils/errors"

export function useChatWorkspace(userId) {
  const [threads, setThreads] = useState([])
  const [messages, setMessages] = useState([])
  const [activeThreadId, setActiveThreadId] = useState(null)
  const [draft, setDraft] = useState("")
  const [isLoadingThreads, setIsLoadingThreads] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [pageError, setPageError] = useState("")
  const [pendingReplyThreadId, setPendingReplyThreadId] = useState("")
  const [availableModels, setAvailableModels] = useState(defaultChatModels)
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const [modelsError, setModelsError] = useState("")
  const [selectedModelKey, setSelectedModelKey] = useState(defaultChatModels[0]?.key ?? "")
  const [selectedTool, setSelectedTool] = useState("")
  const [composerNotice, setComposerNotice] = useState("")
  const endOfMessagesRef = useRef(null)

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
  const isPendingThread =
    pendingReplyThreadId && pendingReplyThreadId === activeThreadId
  const hasAvailableModels = availableModels.length > 0

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    })
  }, [messages, isPendingThread])

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
      setActiveThreadId((currentThreadId) =>
        currentThreadId && nextThreads.some((thread) => thread.id === currentThreadId)
          ? currentThreadId
          : null,
      )
    } catch (error) {
      setThreads([])
      setActiveThreadId(null)
      setPageError(getErrorMessage(error))
    } finally {
      setIsLoadingThreads(false)
    }
  }, [userId])

  useEffect(() => {
    void loadThreads()
  }, [loadThreads])

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
          setMessages(nextMessages)
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

  const createNewChat = () => {
    setActiveThreadId(null)
    setMessages([])
    setDraft("")
    setPendingReplyThreadId("")
    setComposerNotice("")
  }

  const selectThread = (threadId) => {
    setActiveThreadId(threadId)
    setComposerNotice("")
  }

  const showComposerNotice = (message) => {
    setComposerNotice(message)
  }

  const upsertThreadState = (nextThread, nextUpdatedAt) => {
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
  }

  const sendMessage = async (event) => {
    event?.preventDefault?.()

    const content = draft.trim()

    if (!content || isSending || !userId || !selectedModelKey) {
      return
    }

    setIsSending(true)
    setPageError("")
    setDraft("")

    try {
      let threadRecord = activeThread

      if (!threadRecord) {
        threadRecord = await createChatThread({
          userId,
          title: getThreadTitle(content),
        })

        upsertThreadState(threadRecord)
        setActiveThreadId(threadRecord.id)
        setMessages([])
      }

      const userMessage = await createChatMessage({
        threadId: threadRecord.id,
        userId,
        role: "user",
        content,
      })

      setMessages((currentMessages) => [...currentMessages, userMessage])
      upsertThreadState(threadRecord, userMessage.created_at)
      setPendingReplyThreadId(threadRecord.id)

      await delay(260)

      const assistantMessage = await createChatMessage({
        threadId: threadRecord.id,
        userId,
        role: "assistant",
        content: buildReply(content),
      })

      setMessages((currentMessages) => [...currentMessages, assistantMessage])
      upsertThreadState(threadRecord, assistantMessage.created_at)
      setPendingReplyThreadId("")
    } catch (error) {
      setPageError(getErrorMessage(error))
      setPendingReplyThreadId("")
    } finally {
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
    composerNotice,
    createNewChat,
    draft,
    endOfMessagesRef,
    groupedThreads,
    handleComposerKeyDown,
    isLoadingMessages,
    isLoadingThreads,
    isPendingThread,
    isSending,
    messages,
    modelsError,
    pageError,
    hasAvailableModels,
    isLoadingModels,
    selectedModelKey,
    selectedModelLabel: selectedModel?.label ?? "",
    selectedTool,
    selectThread,
    sendMessage,
    setComposerNotice: showComposerNotice,
    setDraft,
    setSelectedModelKey,
    setSelectedTool,
    availableModels,
  }
}
