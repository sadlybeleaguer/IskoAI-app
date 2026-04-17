import { useEffect, useState } from "react"
import { MessageSquarePlus, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"

const streamingStatusSteps = ["Thinking", "Working through it", "Finishing up"]

function AssistantStreamingStatus() {
  const [statusIndex, setStatusIndex] = useState(0)

  useEffect(() => {
    const workingTimerId = window.setTimeout(() => {
      setStatusIndex(1)
    }, 4000)
    const finishingTimerId = window.setTimeout(() => {
      setStatusIndex(2)
    }, 12000)

    return () => {
      window.clearTimeout(workingTimerId)
      window.clearTimeout(finishingTimerId)
    }
  }, [])

  return (
    <div className="mb-2 flex items-center gap-2 pl-1 text-[0.72rem] font-medium text-muted-foreground">
      <span>Assistant</span>
      <span className="flex items-center gap-1 text-foreground/45 dark:text-foreground/55">
        {[0, 180, 360].map((delay) => (
          <span
            key={delay}
            aria-hidden="true"
            className="size-1 rounded-full bg-current motion-safe:animate-pulse"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span>{streamingStatusSteps[statusIndex]}</span>
    </div>
  )
}

export function ChatThreadView({
  activeThread,
  endOfMessagesRef,
  isLoadingMessages,
  messages,
  onNewChat,
  streamingMessageId,
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{activeThread.title}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>Saved thread</span>
            {activeThread.attached_note_title ? (
              <span className="truncate">
                Note {activeThread.attached_note_title}
              </span>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="hidden sm:inline-flex"
          onClick={onNewChat}
        >
          <MessageSquarePlus data-icon="inline-start" />
          New chat
        </Button>
      </div>

      {isLoadingMessages ? (
        <p className="text-sm text-muted-foreground">Loading conversation...</p>
      ) : null}

      {messages.map((message) => {
        const isStreaming = Boolean(
          message.isStreaming || message.id === streamingMessageId,
        )
        const isAssistant = message.role === "assistant"
        const hasContent = Boolean(message.content)
        const userBubbleClassName =
          "max-w-3xl rounded-[1.35rem] border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-950 whitespace-pre-wrap shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-colors"
        const assistantContentClassName =
          "max-w-3xl px-1 text-sm leading-6 text-foreground whitespace-pre-wrap"

        if (isAssistant && !hasContent && !isStreaming) {
          return null
        }

        const messageKey =
          isAssistant && isStreaming
            ? `assistant-streaming-${activeThread.id}`
            : message.id

        return (
          <article
            key={messageKey}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {isAssistant ? (
              <div className="max-w-3xl">
                {isStreaming ? <AssistantStreamingStatus /> : null}
                {hasContent ? (
                  <div className={assistantContentClassName}>
                    {message.content}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className={userBubbleClassName}>{message.content}</div>
            )}
          </article>
        )
      })}

      <div ref={endOfMessagesRef} />
    </div>
  )
}

export function ChatEmptyState({ children, selectedModelLabel }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3 text-3xl font-medium tracking-tight">
            <span className="flex size-10 items-center justify-center rounded-full border">
              <Sparkles className="size-5" />
            </span>
            {selectedModelLabel || "No models available"}
          </div>
          <p className="text-sm text-muted-foreground">Workspace model</p>
        </div>

        {children}
      </div>
    </div>
  )
}
