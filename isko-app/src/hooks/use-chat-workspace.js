import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  createChatMessage,
  createChatThread,
  listChatMessages,
  listChatThreads,
} from "@/services/chat-service"
import {
  buildReply,
  delay,
  getThreadTitle,
  groupThreads,
  modelOptions,
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
  const [selectedModel, setSelectedModel] = useState(modelOptions[0])
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
  const isPendingThread =
    pendingReplyThreadId && pendingReplyThreadId === activeThreadId

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    })
  }, [messages, isPendingThread])

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

    if (!content || isSending || !userId) {
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
    pageError,
    selectedModel,
    selectedTool,
    selectThread,
    sendMessage,
    setComposerNotice: showComposerNotice,
    setDraft,
    setSelectedModel,
    setSelectedTool,
  }
}
