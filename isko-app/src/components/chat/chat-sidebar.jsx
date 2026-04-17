import { Trash2 } from "lucide-react"

import { formatRelativeTime } from "@/utils/chat"
import { cn } from "@/utils/cn"

export function ChatSidebar({
  activeThreadId,
  deletingThreadId,
  groupedThreads,
  isLoadingThreads,
  onDeleteThread,
  onSelectThread,
}) {
  return (
    <div className="flex flex-col gap-4 py-3">
      {isLoadingThreads ? (
        <p className="px-3 text-sm text-muted-foreground">Loading chats...</p>
      ) : null}

      {!isLoadingThreads && !groupedThreads.length ? (
        <p className="px-3 text-sm text-muted-foreground">
          Chats will appear here after the first saved message.
        </p>
      ) : null}

      {groupedThreads.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-3 py-1 text-xs text-muted-foreground">{group.label}</p>
          {group.items.map((thread) => (
            <div
              key={thread.id}
              className={cn(
                "group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-1 transition-colors",
                activeThreadId === thread.id
                  ? "bg-background text-foreground"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center rounded-lg px-2 py-2.5 text-left"
                onClick={() => onSelectThread(thread.id)}
              >
                <span className="min-w-0 flex-1 truncate text-sm">{thread.title}</span>
              </button>
              <div className="flex items-center justify-end gap-1.5 pr-2 text-xs text-muted-foreground">
                <span
                  className="transition-colors duration-150 group-hover:text-foreground/70 group-focus-within:text-foreground/70"
                >
                  {formatRelativeTime(thread.updated_at)}
                </span>
                <button
                  type="button"
                  className={cn(
                    "flex size-4 items-center justify-center text-muted-foreground opacity-0 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:text-foreground focus-visible:outline-none",
                    deletingThreadId === thread.id && "opacity-100",
                  )}
                  onClick={(event) => {
                    event.stopPropagation()
                    onDeleteThread(thread.id)
                  }}
                  disabled={deletingThreadId === thread.id}
                  aria-label={`Delete ${thread.title}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
