import { MessageSquarePlus, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"

export function ChatThreadView({
  activeThread,
  endOfMessagesRef,
  isLoadingMessages,
  isPendingThread,
  messages,
  onNewChat,
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{activeThread.title}</p>
          <p className="text-sm text-muted-foreground">Saved thread</p>
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

      {messages.map((message) => (
        <article
          key={message.id}
          className={cn(
            "flex gap-3",
            message.role === "user" ? "justify-end" : "justify-start",
          )}
        >
          {message.role === "assistant" ? (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted text-xs font-medium">
              AI
            </div>
          ) : null}
          <div
            className={cn(
              "max-w-3xl rounded-lg border px-4 py-3 text-sm leading-6 whitespace-pre-wrap shadow-[0_1px_2px_rgba(15,23,42,0.08)]",
              message.role === "user"
                ? "bg-foreground text-background"
                : "bg-background text-foreground",
            )}
          >
            {message.content}
          </div>
        </article>
      ))}

      {isPendingThread ? (
        <article className="flex justify-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted text-xs font-medium">
            AI
          </div>
          <div className="rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
            IskoAI is drafting a reply...
          </div>
        </article>
      ) : null}

      <div ref={endOfMessagesRef} />
    </div>
  )
}

export function ChatEmptyState({ children, selectedModel }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3 text-3xl font-medium tracking-tight">
            <span className="flex size-10 items-center justify-center rounded-full border">
              <Sparkles className="size-5" />
            </span>
            {selectedModel}
          </div>
          <p className="text-sm text-muted-foreground">Workspace model</p>
        </div>

        {children}
      </div>
    </div>
  )
}
